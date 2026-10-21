namespace Pps.Api.Controllers.Storage;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Controllers.Storage.Dtos;
using Pps.Domain.Images;
using Pps.Infrastructure.Persistence;

[ApiController]
[Authorize(Roles = "admin")]
[Produces("application/json")]
[Tags("images")]
public class StorageController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly AppDbContext _db;
    private readonly ILogger<StorageController> _logger;

    public StorageController(
        IStorageService storageService,
        AppDbContext db,
        ILogger<StorageController> logger)
    {
        _storageService = storageService;
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Solo administradores. Lista los archivos disponibles en el volumen de imágenes del servidor.
    /// </summary>
    /// <param name="prefix">Prefijo opcional de ruta relativa para filtrar archivos.</param>
    /// <param name="cancellationToken">Token de cancelación.</param>
    [HttpGet("api/v1/storage/files")]
    [ProducesResponseType(typeof(StorageFileListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<StorageFileListResponse>> ListStorageFiles(
        [FromQuery] string? prefix,
        CancellationToken cancellationToken)
    {
        var files = _storageService.ListFiles(prefix);

        var registeredImages = await _db.Images
            .AsNoTracking()
            .Select(i => new { i.StorageKey, i.DatasetId })
            .ToListAsync(cancellationToken);

        var datasetLookup = registeredImages
            .GroupBy(x => x.StorageKey)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.DatasetId).Distinct().OrderBy(id => id).ToList(),
                StringComparer.OrdinalIgnoreCase
            );

        var items = files.Select(f => new StorageFileResponse
        {
            StorageKey = f.StorageKey,
            SizeBytes = f.SizeBytes,
            Kind = f.Kind,
            RegisteredInDatasets = datasetLookup.TryGetValue(f.StorageKey, out var ids) ? ids : new List<long>()
        }).ToList();

        return Ok(new StorageFileListResponse { Items = items });
    }
}
