namespace Pps.Api.Controllers.Annotations;

using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Annotations.Dtos;
using Pps.Domain.Annotations;
using Pps.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Produces("application/json")]
[Tags("annotations")]
public class AnnotationsController : ControllerBase
{
    private static readonly JsonSerializerOptions GeometryJsonOptions = new()
    {
        AllowOutOfOrderMetadataProperties = true
    };

    private readonly AppDbContext _db;
    private readonly ILogger<AnnotationsController> _logger;

    public AnnotationsController(AppDbContext db, ILogger<AnnotationsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Crea una anotación para el usuario de la sesión sobre la imagen especificada.
    /// Valida forma (400) y reglas de dominio (422).
    /// </summary>
    [HttpPost("api/v1/images/{imageId:long}/annotations")]
    [ProducesResponseType(typeof(AnnotationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<AnnotationResponse>> CreateAnnotation(
        [FromRoute] long imageId,
        [FromBody] CreateAnnotationRequest request,
        CancellationToken cancellationToken)
    {
        var (userId, username) = GetCurrentUser();

        // 1. Verificar existencia de la imagen
        var image = await _db.Images
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == imageId, cancellationToken);

        if (image == null)
        {
            throw new NotFoundProblemException($"No se encontró la imagen con ID {imageId}.");
        }

        // 2. Verificar que la clase pertenezca al dataset de la imagen (422 class-not-in-dataset)
        var classExists = await _db.LabelClasses
            .AsNoTracking()
            .AnyAsync(c => c.Id == request.ClassId!.Value && c.DatasetId == image.DatasetId, cancellationToken);

        if (!classExists)
        {
            throw new ClassNotInDatasetException(
                $"La clase con ID {request.ClassId!.Value} no pertenece al dataset {image.DatasetId} de la imagen.");
        }

        // 3. Validar geometría contra dimensiones de la imagen en nivel 0 (422)
        GeometryValidator.ValidateAgainstImage(request.Geometry!, image.WidthL0, image.HeightL0);

        // 4. Calcular caja envolvente y área precalculada
        var (minX, minY, maxX, maxY) = request.Geometry!.ComputeBbox();
        var area = request.Geometry!.ComputeArea();
        var geometryJson = JsonSerializer.Serialize<Geometry>(request.Geometry!);

        var now = DateTime.UtcNow;
        var annotation = new Annotation
        {
            DatasetId = image.DatasetId,
            ImageId = image.Id,
            ClassId = request.ClassId!.Value,
            AuthorId = userId,
            GeometryJson = geometryJson,
            BboxMinX = minX,
            BboxMinY = minY,
            BboxMaxX = maxX,
            BboxMaxY = maxY,
            Area = area,
            Source = "manual",
            CreatedAt = now,
            UpdatedAt = now
        };

        _db.Annotations.Add(annotation);
        await _db.SaveChangesAsync(cancellationToken);

        Response.Headers.ETag = $"\"{annotation.Version}\"";
        var location = $"/api/v1/annotations/{annotation.Id}";

        return Created(location, MapToResponse(annotation, request.Geometry, username));
    }

    /// <summary>
    /// Lista anotaciones vigentes (no borradas) de la imagen, con filtro por autor.
    /// </summary>
    [HttpGet("api/v1/images/{imageId:long}/annotations")]
    [ProducesResponseType(typeof(AnnotationListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnnotationListResponse>> ListAnnotations(
        [FromRoute] long imageId,
        [FromQuery] string? author = "me",
        CancellationToken cancellationToken = default)
    {
        var (userId, _) = GetCurrentUser();

        // 1. Verificar existencia de la imagen
        var imageExists = await _db.Images.AnyAsync(i => i.Id == imageId, cancellationToken);
        if (!imageExists)
        {
            throw new NotFoundProblemException($"No se encontró la imagen con ID {imageId}.");
        }

        // 2. Determinar filtro de autor
        long? filterAuthorId = null;
        bool filterAll = false;

        if (string.IsNullOrWhiteSpace(author) || author.Equals("me", StringComparison.OrdinalIgnoreCase))
        {
            filterAuthorId = userId;
        }
        else if (author.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            filterAll = true;
        }
        else if (long.TryParse(author, out var parsedId) && parsedId > 0)
        {
            filterAuthorId = parsedId;
        }
        else
        {
            var problem = new ProblemDetails
            {
                Type = GiaProblemTypes.Validation,
                Title = "Validation Problem",
                Status = StatusCodes.Status400BadRequest,
                Detail = "El parámetro 'author' debe ser 'me', 'all' o un ID numérico de usuario positivo.",
                Instance = HttpContext.Request.Path
            };
            problem.Extensions["traceId"] = HttpContext.TraceIdentifier;
            return BadRequest(problem);
        }

        // 3. Consultar anotaciones vigentes
        var query = _db.Annotations
            .AsNoTracking()
            .Include(a => a.Author)
            .Where(a => a.ImageId == imageId);

        if (!filterAll && filterAuthorId.HasValue)
        {
            query = query.Where(a => a.AuthorId == filterAuthorId.Value);
        }

        var list = await query
            .OrderBy(a => a.Id)
            .ToListAsync(cancellationToken);

        var items = list.Select(a => MapToResponse(a)).ToList();
        return Ok(new AnnotationListResponse { Items = items });
    }

    /// <summary>
    /// Consulta individual de una anotación por su ID.
    /// </summary>
    [HttpGet("api/v1/annotations/{annotationId:long}")]
    [ProducesResponseType(typeof(AnnotationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnnotationResponse>> GetAnnotation(
        [FromRoute] long annotationId,
        CancellationToken cancellationToken)
    {
        var annotation = await _db.Annotations
            .AsNoTracking()
            .Include(a => a.Author)
            .FirstOrDefaultAsync(a => a.Id == annotationId, cancellationToken);

        if (annotation == null)
        {
            throw new NotFoundProblemException($"No se encontró la anotación con ID {annotationId}.");
        }

        Response.Headers.ETag = $"\"{annotation.Version}\"";
        return Ok(MapToResponse(annotation));
    }

    /// <summary>
    /// Actualiza parcialmente una anotación. Solo el autor puede modificarla (ADR-07).
    /// Requiere cabecera If-Match con la versión vigente (concurrencia optimista).
    /// </summary>
    [HttpPatch("api/v1/annotations/{annotationId:long}")]
    [ProducesResponseType(typeof(AnnotationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status412PreconditionFailed)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status428PreconditionRequired)]
    public async Task<ActionResult<AnnotationResponse>> UpdateAnnotation(
        [FromRoute] long annotationId,
        [FromBody] UpdateAnnotationRequest request,
        CancellationToken cancellationToken)
    {
        var (userId, _) = GetCurrentUser();

        // 1. Validar cabecera If-Match obligatoria
        var ifMatch = Request.Headers.IfMatch.ToString();
        if (string.IsNullOrWhiteSpace(ifMatch))
        {
            throw new PreconditionRequiredProblemException(
                "La cabecera 'If-Match' es obligatoria para actualizar anotaciones.");
        }

        // 2. Cargar anotación
        var annotation = await _db.Annotations
            .Include(a => a.Author)
            .Include(a => a.Image)
            .FirstOrDefaultAsync(a => a.Id == annotationId, cancellationToken);

        if (annotation == null)
        {
            throw new NotFoundProblemException($"No se encontró la anotación con ID {annotationId}.");
        }

        // 3. Validar autoría (ADR-07: ni siquiera admin puede modificar anotaciones ajenas)
        if (annotation.AuthorId != userId)
        {
            throw new ForbiddenProblemException("Solo el autor de la anotación puede modificarla.");
        }

        // 4. Validar versión optimista If-Match
        var cleanIfMatch = ifMatch.Trim();
        if (cleanIfMatch.StartsWith("W/", StringComparison.OrdinalIgnoreCase))
        {
            cleanIfMatch = cleanIfMatch[2..].Trim();
        }
        cleanIfMatch = cleanIfMatch.Trim('\"', ' ');

        if (!uint.TryParse(cleanIfMatch, out var expectedVersion) || annotation.Version != expectedVersion)
        {
            throw new PreconditionFailedProblemException(
                "La versión proporcionada en If-Match no coincide con la versión vigente de la anotación.");
        }

        // 5. Aplicar cambios a classId si se especificó
        if (request.ClassId.HasValue && request.ClassId.Value != annotation.ClassId)
        {
            var classExists = await _db.LabelClasses
                .AsNoTracking()
                .AnyAsync(c => c.Id == request.ClassId.Value && c.DatasetId == annotation.DatasetId, cancellationToken);

            if (!classExists)
            {
                throw new ClassNotInDatasetException(
                    $"La clase con ID {request.ClassId.Value} no pertenece al dataset {annotation.DatasetId} de la anotación.");
            }

            annotation.ClassId = request.ClassId.Value;
        }

        // 6. Aplicar cambios a geometry si se especificó
        Geometry? newGeometry = null;
        if (request.Geometry != null)
        {
            GeometryValidator.ValidateAgainstImage(request.Geometry, annotation.Image.WidthL0, annotation.Image.HeightL0);

            var (minX, minY, maxX, maxY) = request.Geometry.ComputeBbox();
            var area = request.Geometry.ComputeArea();

            annotation.GeometryJson = JsonSerializer.Serialize<Geometry>(request.Geometry);
            annotation.BboxMinX = minX;
            annotation.BboxMinY = minY;
            annotation.BboxMaxX = maxX;
            annotation.BboxMaxY = maxY;
            annotation.Area = area;
            newGeometry = request.Geometry;
        }

        annotation.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new PreconditionFailedProblemException(
                "Conflicto de concurrencia optimista al persistir la anotación.");
        }

        Response.Headers.ETag = $"\"{annotation.Version}\"";
        return Ok(MapToResponse(annotation, newGeometry, annotation.Author.Username));
    }

    /// <summary>
    /// Borrado lógico de una anotación. Solo el autor puede eliminarla (ADR-07).
    /// Cabecera If-Match opcional; si se envía, se valida contra la versión vigente.
    /// </summary>
    [HttpDelete("api/v1/annotations/{annotationId:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status412PreconditionFailed)]
    public async Task<IActionResult> DeleteAnnotation(
        [FromRoute] long annotationId,
        CancellationToken cancellationToken)
    {
        var (userId, _) = GetCurrentUser();

        // 1. Cargar anotación
        var annotation = await _db.Annotations
            .FirstOrDefaultAsync(a => a.Id == annotationId, cancellationToken);

        if (annotation == null)
        {
            throw new NotFoundProblemException($"No se encontró la anotación con ID {annotationId}.");
        }

        // 2. Validar autoría (ADR-07)
        if (annotation.AuthorId != userId)
        {
            throw new ForbiddenProblemException("Solo el autor de la anotación puede eliminarla.");
        }

        // 3. Validar If-Match opcional si fue provisto
        var ifMatch = Request.Headers.IfMatch.ToString();
        if (!string.IsNullOrWhiteSpace(ifMatch))
        {
            var cleanIfMatch = ifMatch.Trim();
            if (cleanIfMatch.StartsWith("W/", StringComparison.OrdinalIgnoreCase))
            {
                cleanIfMatch = cleanIfMatch[2..].Trim();
            }
            cleanIfMatch = cleanIfMatch.Trim('\"', ' ');

            if (!uint.TryParse(cleanIfMatch, out var expectedVersion) || annotation.Version != expectedVersion)
            {
                throw new PreconditionFailedProblemException(
                    "La versión proporcionada en If-Match no coincide con la versión vigente de la anotación.");
            }
        }

        // 4. Borrado lógico
        annotation.DeletedAt = DateTime.UtcNow;
        annotation.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new PreconditionFailedProblemException(
                "Conflicto de concurrencia optimista al eliminar la anotación.");
        }

        return NoContent();
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

    private static AnnotationResponse MapToResponse(Annotation a, Geometry? geometry = null, string? username = null)
    {
        var geom = geometry ?? JsonSerializer.Deserialize<Geometry>(a.GeometryJson, GeometryJsonOptions)!;
        return new AnnotationResponse
        {
            Id = a.Id,
            ImageId = a.ImageId,
            ClassId = a.ClassId,
            AuthorId = a.AuthorId,
            AuthorUsername = username ?? a.Author?.Username ?? string.Empty,
            Source = a.Source,
            Geometry = geom,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt,
            Version = a.Version
        };
    }
}
