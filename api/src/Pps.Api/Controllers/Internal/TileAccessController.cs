namespace Pps.Api.Controllers.Internal;

using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Infrastructure.Persistence;

[ApiController]
[Route("internal/v1/tile-access")]
[Tags("internal")]
public class TileAccessController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private static readonly Regex ImageIdRegex = new(@"/images/(?<id>\d+)", RegexOptions.Compiled);

    public TileAccessController(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Endpoint interno para Nginx auth_request (ADR-04, OpenAPI §/internal/v1/tile-access).
    /// Valida la cookie de sesión, extrae el id de imagen de X-Original-URI y responde 204 con X-Storage-Key.
    /// Nunca responde 302: Nginx trataría cualquier código distinto de 2xx, 401 y 403 como error.
    /// </summary>
    [HttpGet]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CheckTileAccess(
        [FromHeader(Name = "X-Original-URI")] string? originalUri,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(originalUri))
        {
            return NoContent();
        }

        var match = ImageIdRegex.Match(originalUri);
        if (match.Success && long.TryParse(match.Groups["id"].Value, out var imageId))
        {
            var image = await _dbContext.Images
                .AsNoTracking()
                .FirstOrDefaultAsync(i => i.Id == imageId, cancellationToken);

            if (image == null)
            {
                return NotFound();
            }

            // Todo usuario autenticado puede ver todas las imágenes en v0.1 (§8.4)
            Response.Headers["X-Storage-Key"] = image.StorageKey;
        }

        return NoContent(); // 204 No Content
    }
}
