namespace Pps.Api.Controllers.Images;

using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Images.Dtos;
using Pps.Domain.Images;
using Pps.Infrastructure.Persistence;

[ApiController]
[Produces("application/json")]
[Tags("images")]
public class ImagesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IStorageService _storageService;
    private readonly IImageInspector _imageInspector;
    private readonly ILogger<ImagesController> _logger;

    public ImagesController(
        AppDbContext db,
        IStorageService storageService,
        IImageInspector imageInspector,
        ILogger<ImagesController> logger)
    {
        _db = db;
        _storageService = storageService;
        _imageInspector = imageInspector;
        _logger = logger;
    }

    /// <summary>
    /// Registra archivos que ya están en el servidor dentro de un dataset.
    /// Operación atómica: si una imagen falla, no se registra ninguna.
    /// Accesible para cualquier usuario autenticado (admin o annotator).
    /// </summary>
    [HttpPost("api/v1/datasets/{datasetId:long}/images")]
    [Authorize]
    [ProducesResponseType(typeof(RegisterImagesResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<RegisterImagesResponse>> RegisterImages(
        [FromRoute] long datasetId,
        [FromBody] RegisterImagesRequest request,
        CancellationToken cancellationToken)
    {
        var datasetExists = await _db.Datasets.AnyAsync(d => d.Id == datasetId, cancellationToken);
        if (!datasetExists)
        {
            throw new NotFoundProblemException($"No se encontró el dataset con ID {datasetId}.");
        }

        // 1. Validar claves contra path traversal
        foreach (var key in request.StorageKeys)
        {
            StorageKeyValidator.Validate(key, allowEmpty: false);
        }

        // 2. Verificar que ninguna clave ya esté registrada en este dataset (409 already-registered)
        var existingKeys = await _db.Images
            .AsNoTracking()
            .Where(i => i.DatasetId == datasetId && request.StorageKeys.Contains(i.StorageKey))
            .Select(i => i.StorageKey)
            .ToListAsync(cancellationToken);

        if (existingKeys.Count > 0)
        {
            throw new ConflictProblemException(
                "already-registered",
                $"Las siguientes imágenes ya están registradas en este dataset: {string.Join(", ", existingKeys)}."
            );
        }

        // 3. Inspeccionar todas las imágenes con IImageInspector (si una falla, aborta)
        var inspections = new List<ImageInspectionResult>();
        foreach (var key in request.StorageKeys)
        {
            var inspection = await _imageInspector.InspectAsync(key, cancellationToken);
            inspections.Add(inspection);
        }

        // 4. Persistencia atómica en una única transacción de base de datos
        var newEntities = inspections.Select(ins => new MedicalImage
        {
            DatasetId = datasetId,
            StorageKey = ins.StorageKey,
            OriginalFilename = Path.GetFileName(ins.StorageKey),
            Kind = ins.Kind,
            Format = ins.Format,
            WidthL0 = ins.Width,
            HeightL0 = ins.Height,
            LevelCount = ins.LevelCount,
            MppX = ins.MppX,
            MppY = ins.MppY,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        _db.Images.AddRange(newEntities);
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var items = newEntities.Select(MapToResponse).ToList();
        return StatusCode(StatusCodes.Status201Created, new RegisterImagesResponse { Items = items });
    }

    /// <summary>
    /// Sube una o múltiples imágenes (SVS, PNG, JPG/JPEG) desde el cliente al almacenamiento del servidor
    /// y las registra atómicamente como pertenecientes al dataset indicado.
    /// Accesible para cualquier usuario autenticado (admin o annotator).
    /// </summary>
    [HttpPost("api/v1/datasets/{datasetId:long}/images/upload")]
    [Authorize]
    [Consumes("multipart/form-data")]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = 10L * 1024 * 1024 * 1024, ValueLengthLimit = int.MaxValue)]
    [ProducesResponseType(typeof(RegisterImagesResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<RegisterImagesResponse>> UploadImages(
        [FromRoute] long datasetId,
        [FromForm] List<IFormFile>? files,
        CancellationToken cancellationToken)
    {
        var datasetExists = await _db.Datasets.AnyAsync(d => d.Id == datasetId, cancellationToken);
        if (!datasetExists)
        {
            throw new NotFoundProblemException($"No se encontró el dataset con ID {datasetId}.");
        }

        var uploadedFiles = (files is { Count: > 0 })
            ? files
            : (Request.HasFormContentType ? Request.Form.Files.ToList() : new List<IFormFile>());

        if (uploadedFiles.Count == 0)
        {
            throw new ValidationProblemException(new Dictionary<string, string[]>
            {
                ["files"] = new[] { "Se debe proporcionar al menos un archivo de imagen para subir." }
            });
        }

        if (uploadedFiles.Count > 2000)
        {
            throw new ValidationProblemException(new Dictionary<string, string[]>
            {
                ["files"] = new[] { "Se permite subir un máximo de 2000 imágenes por lote." }
            });
        }

        var emptyFiles = uploadedFiles.Where(f => f.Length <= 0).Select(f => f.FileName).ToList();
        if (emptyFiles.Count > 0)
        {
            throw new ValidationProblemException(new Dictionary<string, string[]>
            {
                ["files"] = new[] { $"Los siguientes archivos están vacíos (0 bytes): {string.Join(", ", emptyFiles)}." }
            });
        }

        // 1. Construir y validar claves de almacenamiento destino (datasets/{datasetId}/{fileName})
        var fileEntries = new List<(IFormFile File, string StorageKey)>(uploadedFiles.Count);
        foreach (var file in uploadedFiles)
        {
            var storageKey = StorageKeyValidator.BuildDatasetStorageKey(datasetId, file.FileName);
            fileEntries.Add((file, storageKey));
        }

        var duplicateKeys = fileEntries
            .GroupBy(x => x.StorageKey, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => Path.GetFileName(g.Key))
            .ToList();

        if (duplicateKeys.Count > 0)
        {
            throw new ValidationProblemException(new Dictionary<string, string[]>
            {
                ["files"] = new[] { $"No se permiten nombres de archivo duplicados en la misma subida: {string.Join(", ", duplicateKeys)}." }
            });
        }

        var targetKeys = fileEntries.Select(x => x.StorageKey).ToList();

        // 2. Verificar que ninguna clave ya esté registrada en este dataset (409 already-registered)
        var existingKeys = await _db.Images
            .AsNoTracking()
            .Where(i => i.DatasetId == datasetId && targetKeys.Contains(i.StorageKey))
            .Select(i => i.StorageKey)
            .ToListAsync(cancellationToken);

        if (existingKeys.Count > 0)
        {
            throw new ConflictProblemException(
                "already-registered",
                $"Las siguientes imágenes ya están registradas en este dataset: {string.Join(", ", existingKeys)}."
            );
        }

        // 3. Guardar archivos en streaming e inspeccionar con el servicio de teselas (con rollback físico si falla)
        var savedKeys = new List<string>(fileEntries.Count);
        var inspections = new List<ImageInspectionResult>(fileEntries.Count);

        try
        {
            foreach (var (file, storageKey) in fileEntries)
            {
                await using (var stream = file.OpenReadStream())
                {
                    await _storageService.SaveFileAsync(storageKey, stream, cancellationToken);
                }
                savedKeys.Add(storageKey);

                var inspection = await _imageInspector.InspectAsync(storageKey, cancellationToken);
                inspections.Add(inspection);
            }

            // 4. Persistencia atómica en base de datos vinculada al dataset
            var newEntities = inspections.Select(ins => new MedicalImage
            {
                DatasetId = datasetId,
                StorageKey = ins.StorageKey,
                OriginalFilename = Path.GetFileName(ins.StorageKey),
                Kind = ins.Kind,
                Format = ins.Format,
                WidthL0 = ins.Width,
                HeightL0 = ins.Height,
                LevelCount = ins.LevelCount,
                MppX = ins.MppX,
                MppY = ins.MppY,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
            _db.Images.AddRange(newEntities);
            await _db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            _logger.LogInformation(
                "Se subieron y registraron {Count} imágenes en el dataset {DatasetId}: {Keys}",
                newEntities.Count, datasetId, string.Join(", ", targetKeys));

            var items = newEntities.Select(MapToResponse).ToList();
            return StatusCode(StatusCodes.Status201Created, new RegisterImagesResponse { Items = items });
        }
        catch
        {
            foreach (var key in savedKeys)
            {
                _storageService.DeleteFile(key);
            }
            throw;
        }
    }

    /// <summary>
    /// Lista de forma paginada las imágenes pertenecientes a un dataset.
    /// </summary>
    [HttpGet("api/v1/datasets/{datasetId:long}/images")]
    [Authorize]
    [ProducesResponseType(typeof(ImagePageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImagePageResponse>> ListImages(
        [FromRoute] long datasetId,
        [FromQuery, Range(1, int.MaxValue)] int page = 1,
        [FromQuery, Range(1, 200)] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var datasetExists = await _db.Datasets.AnyAsync(d => d.Id == datasetId, cancellationToken);
        if (!datasetExists)
        {
            throw new NotFoundProblemException($"No se encontró el dataset con ID {datasetId}.");
        }

        var query = _db.Images
            .AsNoTracking()
            .Where(i => i.DatasetId == datasetId);

        var total = await query.CountAsync(cancellationToken);

        var images = await query
            .OrderBy(i => i.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var items = images.Select(MapToResponse).ToList();

        return Ok(new ImagePageResponse
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            Total = total
        });
    }

    /// <summary>
    /// Consulta los metadatos técnicos de una imagen y su URL de fuente DZI.
    /// </summary>
    [HttpGet("api/v1/images/{imageId:long}")]
    [Authorize]
    [ProducesResponseType(typeof(ImageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ImageResponse>> GetImage(
        [FromRoute] long imageId,
        CancellationToken cancellationToken)
    {
        var image = await _db.Images
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == imageId, cancellationToken);

        if (image == null)
        {
            throw new NotFoundProblemException($"No se encontró la imagen con ID {imageId}.");
        }

        return Ok(MapToResponse(image));
    }

    private static ImageResponse MapToResponse(MedicalImage image) => new()
    {
        Id = image.Id,
        DatasetId = image.DatasetId,
        StorageKey = image.StorageKey,
        Name = image.OriginalFilename,
        Kind = image.Kind,
        Format = image.Format,
        Width = image.WidthL0,
        Height = image.HeightL0,
        LevelCount = image.LevelCount,
        MppX = image.MppX,
        MppY = image.MppY,
        TileSourceUrl = $"/tiles/v1/images/{image.Id}.dzi",
        RegisteredAt = image.CreatedAt
    };
}
