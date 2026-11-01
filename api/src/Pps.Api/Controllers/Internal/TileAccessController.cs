namespace Pps.Api.Controllers.Internal;

using System.Security.Claims;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Pps.Api.Common.Access;
using Pps.Domain.Access;

[ApiController]
[Route("internal/v1/tile-access")]
[Tags("internal")]
public class TileAccessController : ControllerBase
{
    private readonly IProjectAccessReader _accessReader;
    private static readonly Regex ImageIdRegex = new(@"/images/(?<id>\d+)", RegexOptions.Compiled);

    public TileAccessController(IProjectAccessReader accessReader)
    {
        _accessReader = accessReader;
    }

    /// <summary>
    /// Endpoint interno para Nginx auth_request (ADR-04, ADR-16, OpenAPI §/internal/v1/tile-access).
    /// Valida la cookie de sesión, extrae el id de imagen de X-Original-URI y, si el usuario sigue activo y es
    /// miembro del proyecto de la imagen (mínimo viewer) o administrador global, responde 204 con X-Storage-Key.
    /// Usuario inactivo: 401. Imagen inexistente o sin membresía: 403.
    /// Nunca lanza excepciones del catálogo ni responde 302/404: Nginx solo admite 2xx, 401 y 403.
    /// </summary>
    [HttpGet]
    [AuthenticatedOnly]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CheckTileAccess(
        [FromHeader(Name = "X-Original-URI")] string? originalUri,
        CancellationToken cancellationToken)
    {
        if (!long.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var userId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(originalUri))
        {
            return Forbid();
        }

        var match = ImageIdRegex.Match(originalUri);
        if (!match.Success || !long.TryParse(match.Groups["id"].Value, out var imageId))
        {
            return Forbid();
        }

        var facts = await _accessReader.FindImageForTileAsync(userId, imageId, cancellationToken);
        if (facts is null)
        {
            return Forbid();
        }

        if (!facts.UserIsActive)
        {
            return Unauthorized();
        }

        var decision = AccessPolicy.Decide(User.IsInRole(GlobalRoles.Admin), Permission.ProjectView, facts.Scope);
        if (decision.Verdict != AccessVerdict.Allowed)
        {
            return Forbid();
        }

        Response.Headers["X-Storage-Key"] = facts.StorageKey;

        return NoContent(); // 204 No Content
    }
}
