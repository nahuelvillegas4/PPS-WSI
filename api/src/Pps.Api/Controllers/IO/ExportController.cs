namespace Pps.Api.Controllers.IO;

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pps.Api.Common.Errors;
using Pps.Domain.Export;

[ApiController]
[Authorize]
[Tags("io")]
public class ExportController : ControllerBase
{
    private readonly IEnumerable<IExporter> _exporters;
    private readonly ILogger<ExportController> _logger;

    public ExportController(IEnumerable<IExporter> exporters, ILogger<ExportController> logger)
    {
        _exporters = exporters;
        _logger = logger;
    }

    /// <summary>
    /// Descarga la exportación del dataset en el formato especificado (ADR-10).
    /// 'internal' es la fuente de verdad y 'coco' es el formato externo obligatorio.
    /// </summary>
    [HttpGet("api/v1/datasets/{datasetId:long}/export")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK, "application/json")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> ExportDataset(
        [FromRoute] long datasetId,
        [FromQuery] string? format,
        [FromQuery] string? authors = "me",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(format))
        {
            throw new ValidationProblemException("El parámetro de consulta 'format' es obligatorio.");
        }

        var normalizedFormat = format.Trim().ToLowerInvariant();

        if (normalizedFormat == "yolo")
        {
            throw new UnprocessableEntityProblemException(
                "unsupported-format",
                "El formato 'yolo' es condicional y está planificado solo si sobra tiempo (ADR-10). Utilice format=internal o format=coco.");
        }

        var exporter = _exporters.FirstOrDefault(e =>
            string.Equals(e.FormatName, normalizedFormat, StringComparison.OrdinalIgnoreCase));

        if (exporter == null)
        {
            throw new ValidationProblemException(
                $"El formato '{format}' no es válido. Los formatos soportados por el contrato son: internal, coco, yolo.");
        }

        var (userId, username) = GetCurrentUser();

        var context = new ExportContext(datasetId, username, userId, authors);
        var result = await exporter.ExportDatasetAsync(context, cancellationToken);

        return File(result.Data, result.ContentType, result.Filename);
    }

    private (long userId, string username) GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthenticatedProblemException("Sesión no válida o ausente.");
        }

        var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "unknown";
        return (userId, username);
    }
}
