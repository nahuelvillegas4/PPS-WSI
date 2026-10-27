namespace Pps.Api.Controllers.IO;

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pps.Api.Common.Errors;
using Pps.Domain.Import;

[ApiController]
[Route("api/v1/datasets/{datasetId:long}/imports")]
[Authorize(Roles = "admin")]
[Produces("application/json")]
[Tags("io")]
public class ImportsController : ControllerBase
{
    private readonly IEnumerable<IAnnotationImporter> _importers;
    private readonly ILogger<ImportsController> _logger;

    public ImportsController(
        IEnumerable<IAnnotationImporter> importers,
        ILogger<ImportsController> logger)
    {
        _importers = importers;
        _logger = logger;
    }

    /// <summary>
    /// Importa anotaciones sincrónica y atómicamente desde una carpeta del volumen de imágenes.
    /// Solo administradores. Con dryRun: true (por defecto) valida y devuelve el reporte sin persistir.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ImportReport), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ImportReport), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ImportAnnotations(
        [FromRoute] long datasetId,
        [FromBody] ImportRequest request,
        CancellationToken cancellationToken)
    {
        var currentUserId = GetCurrentUserId();

        var importer = _importers.FirstOrDefault(i =>
            string.Equals(i.Format, request.Format, StringComparison.OrdinalIgnoreCase));

        if (importer == null)
        {
            throw new ValidationProblemException(
                $"No existe un adaptador de importación para el formato '{request.Format}'. v0.1 admite únicamente 'cric'.");
        }

        _logger.LogInformation(
            "Iniciando importación '{Format}' en dataset {DatasetId} desde '{Source}' (dryRun: {DryRun}) por usuario {UserId}...",
            request.Format, datasetId, request.Source, request.DryRun, currentUserId);

        var report = await importer.ImportAsync(datasetId, currentUserId, request, cancellationToken);

        if (report.DryRun)
        {
            return Ok(report);
        }

        return StatusCode(StatusCodes.Status201Created, report);
    }

    private long GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (long.TryParse(claim, out var id))
        {
            return id;
        }

        throw new UnauthenticatedProblemException("No hay una sesión válida activa.");
    }
}
