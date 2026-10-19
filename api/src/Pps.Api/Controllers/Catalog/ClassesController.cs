namespace Pps.Api.Controllers.Catalog;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Catalog.Dtos;
using Pps.Domain.Catalog;
using Pps.Infrastructure.Persistence;

[ApiController]
[Authorize]
[Produces("application/json")]
public class ClassesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<ClassesController> _logger;

    public ClassesController(AppDbContext db, ILogger<ClassesController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Lista las clases del dataset ordenadas por displayOrder y luego por id.
    /// </summary>
    [HttpGet("api/v1/datasets/{datasetId:long}/classes")]
    [ProducesResponseType(typeof(LabelClassListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<LabelClassListResponse>> ListClasses([FromRoute] long datasetId)
    {
        var datasetExists = await _db.Datasets.AnyAsync(d => d.Id == datasetId);
        if (!datasetExists)
        {
            throw new NotFoundProblemException($"No se encontró el dataset con ID {datasetId}.");
        }

        var classes = await _db.LabelClasses
            .Where(c => c.DatasetId == datasetId)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Id)
            .Select(c => new LabelClassResponse
            {
                Id = c.Id,
                DatasetId = c.DatasetId,
                Name = c.Name,
                Color = c.Color,
                DisplayOrder = c.DisplayOrder
            })
            .ToListAsync();

        return Ok(new LabelClassListResponse { Items = classes });
    }

    /// <summary>
    /// Crea una nueva clase en el dataset. Solo administradores. 409 si el nombre ya existe en el dataset.
    /// </summary>
    [HttpPost("api/v1/datasets/{datasetId:long}/classes")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(typeof(LabelClassResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LabelClassResponse>> CreateClass(
        [FromRoute] long datasetId,
        [FromBody] LabelClassInput request)
    {
        var datasetExists = await _db.Datasets.AnyAsync(d => d.Id == datasetId);
        if (!datasetExists)
        {
            throw new NotFoundProblemException($"No se encontró el dataset con ID {datasetId}.");
        }

        var duplicateName = await _db.LabelClasses.AnyAsync(c => c.DatasetId == datasetId && c.Name == request.Name);
        if (duplicateName)
        {
            throw new ConflictProblemException("duplicate-name", $"Ya existe una clase con el nombre '{request.Name}' en el dataset {datasetId}.");
        }

        var labelClass = new LabelClass
        {
            DatasetId = datasetId,
            Name = request.Name,
            Color = request.Color,
            DisplayOrder = request.DisplayOrder ?? 0
        };

        _db.LabelClasses.Add(labelClass);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Clase '{Name}' (ID: {ClassId}) creada en el dataset {DatasetId}.", labelClass.Name, labelClass.Id, datasetId);

        var response = new LabelClassResponse
        {
            Id = labelClass.Id,
            DatasetId = labelClass.DatasetId,
            Name = labelClass.Name,
            Color = labelClass.Color,
            DisplayOrder = labelClass.DisplayOrder
        };

        return Created($"/api/v1/classes/{labelClass.Id}", response);
    }

    /// <summary>
    /// Actualiza una clase de etiquetado. Solo administradores.
    /// </summary>
    [HttpPatch("api/v1/classes/{classId:long}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(typeof(LabelClassResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<LabelClassResponse>> UpdateClass(
        [FromRoute] long classId,
        [FromBody] LabelClassPatch request)
    {
        var labelClass = await _db.LabelClasses.FindAsync(classId);
        if (labelClass == null)
        {
            throw new NotFoundProblemException($"No se encontró la clase con ID {classId}.");
        }

        if (!string.IsNullOrEmpty(request.Name) && request.Name != labelClass.Name)
        {
            var duplicateName = await _db.LabelClasses.AnyAsync(c =>
                c.DatasetId == labelClass.DatasetId &&
                c.Name == request.Name &&
                c.Id != classId);

            if (duplicateName)
            {
                throw new ConflictProblemException("duplicate-name", $"Ya existe una clase con el nombre '{request.Name}' en el dataset {labelClass.DatasetId}.");
            }

            labelClass.Name = request.Name;
        }

        if (!string.IsNullOrEmpty(request.Color))
        {
            labelClass.Color = request.Color;
        }

        if (request.DisplayOrder.HasValue)
        {
            labelClass.DisplayOrder = request.DisplayOrder.Value;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Clase ID {ClassId} actualizada.", labelClass.Id);

        return Ok(new LabelClassResponse
        {
            Id = labelClass.Id,
            DatasetId = labelClass.DatasetId,
            Name = labelClass.Name,
            Color = labelClass.Color,
            DisplayOrder = labelClass.DisplayOrder
        });
    }

    /// <summary>
    /// Elimina una clase de etiquetado. Solo administradores. Falla con 409 (class-in-use) si la clase tiene anotaciones.
    /// </summary>
    [HttpDelete("api/v1/classes/{classId:long}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteClass([FromRoute] long classId)
    {
        var labelClass = await _db.LabelClasses.FindAsync(classId);
        if (labelClass == null)
        {
            throw new NotFoundProblemException($"No se encontró la clase con ID {classId}.");
        }

        var inUse = await _db.Annotations
            .IgnoreQueryFilters()
            .AnyAsync(a => a.DatasetId == labelClass.DatasetId && a.ClassId == classId);

        if (inUse)
        {
            throw new ConflictProblemException("class-in-use", $"No se puede eliminar la clase con ID {classId} porque tiene anotaciones asociadas.");
        }

        _db.LabelClasses.Remove(labelClass);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Clase '{Name}' (ID: {ClassId}) eliminada exitosamente.", labelClass.Name, labelClass.Id);

        return NoContent();
    }
}
