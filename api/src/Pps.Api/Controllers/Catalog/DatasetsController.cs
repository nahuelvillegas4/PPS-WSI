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
public class DatasetsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<DatasetsController> _logger;

    public DatasetsController(AppDbContext db, ILogger<DatasetsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Lista los datasets pertenecientes a un proyecto.
    /// </summary>
    [HttpGet("api/v1/projects/{projectId:long}/datasets")]
    [ProducesResponseType(typeof(DatasetListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DatasetListResponse>> ListDatasets([FromRoute] long projectId)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == projectId);
        if (!projectExists)
        {
            throw new NotFoundProblemException($"No se encontró el proyecto con ID {projectId}.");
        }

        var datasets = await _db.Datasets
            .Where(d => d.ProjectId == projectId)
            .OrderBy(d => d.Id)
            .Select(d => new DatasetResponse
            {
                Id = d.Id,
                ProjectId = d.ProjectId,
                Name = d.Name,
                Description = d.Description,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();

        return Ok(new DatasetListResponse { Items = datasets });
    }

    /// <summary>
    /// Crea un nuevo dataset dentro de un proyecto. Solo administradores.
    /// </summary>
    [HttpPost("api/v1/projects/{projectId:long}/datasets")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(typeof(DatasetResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DatasetResponse>> CreateDataset(
        [FromRoute] long projectId,
        [FromBody] DatasetInput request)
    {
        var projectExists = await _db.Projects.AnyAsync(p => p.Id == projectId);
        if (!projectExists)
        {
            throw new NotFoundProblemException($"No se encontró el proyecto con ID {projectId}.");
        }

        var duplicateName = await _db.Datasets.AnyAsync(d => d.ProjectId == projectId && d.Name == request.Name);
        if (duplicateName)
        {
            throw new ConflictProblemException("duplicate-name", $"Ya existe un dataset con el nombre '{request.Name}' en el proyecto {projectId}.");
        }

        var dataset = new Dataset
        {
            ProjectId = projectId,
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow
        };

        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Dataset '{Name}' (ID: {DatasetId}) creado en el proyecto {ProjectId}.", dataset.Name, dataset.Id, projectId);

        var response = new DatasetResponse
        {
            Id = dataset.Id,
            ProjectId = dataset.ProjectId,
            Name = dataset.Name,
            Description = dataset.Description,
            CreatedAt = dataset.CreatedAt
        };

        return Created($"/api/v1/datasets/{dataset.Id}", response);
    }

    /// <summary>
    /// Obtiene un dataset por su identificador.
    /// </summary>
    [HttpGet("api/v1/datasets/{datasetId:long}")]
    [ProducesResponseType(typeof(DatasetResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DatasetResponse>> GetDataset([FromRoute] long datasetId)
    {
        var dataset = await _db.Datasets.FindAsync(datasetId);
        if (dataset == null)
        {
            throw new NotFoundProblemException($"No se encontró el dataset con ID {datasetId}.");
        }

        return Ok(new DatasetResponse
        {
            Id = dataset.Id,
            ProjectId = dataset.ProjectId,
            Name = dataset.Name,
            Description = dataset.Description,
            CreatedAt = dataset.CreatedAt
        });
    }

    /// <summary>
    /// Actualiza el nombre o descripción de un dataset. Solo administradores.
    /// </summary>
    [HttpPatch("api/v1/datasets/{datasetId:long}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(typeof(DatasetResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<DatasetResponse>> UpdateDataset(
        [FromRoute] long datasetId,
        [FromBody] DatasetPatch request)
    {
        var dataset = await _db.Datasets.FindAsync(datasetId);
        if (dataset == null)
        {
            throw new NotFoundProblemException($"No se encontró el dataset con ID {datasetId}.");
        }

        if (!string.IsNullOrEmpty(request.Name) && request.Name != dataset.Name)
        {
            var duplicateName = await _db.Datasets.AnyAsync(d =>
                d.ProjectId == dataset.ProjectId &&
                d.Name == request.Name &&
                d.Id != datasetId);

            if (duplicateName)
            {
                throw new ConflictProblemException("duplicate-name", $"Ya existe un dataset con el nombre '{request.Name}' en el proyecto {dataset.ProjectId}.");
            }

            dataset.Name = request.Name;
        }

        if (request.Description != null)
        {
            dataset.Description = request.Description;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Dataset ID {DatasetId} actualizado.", dataset.Id);

        return Ok(new DatasetResponse
        {
            Id = dataset.Id,
            ProjectId = dataset.ProjectId,
            Name = dataset.Name,
            Description = dataset.Description,
            CreatedAt = dataset.CreatedAt
        });
    }

    /// <summary>
    /// Elimina un dataset. Solo administradores. Falla con 409 si el dataset tiene imágenes registradas (ADR-07).
    /// </summary>
    [HttpDelete("api/v1/datasets/{datasetId:long}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteDataset([FromRoute] long datasetId)
    {
        var dataset = await _db.Datasets.FindAsync(datasetId);
        if (dataset == null)
        {
            throw new NotFoundProblemException($"No se encontró el dataset con ID {datasetId}.");
        }

        var hasImages = await _db.Images.AnyAsync(i => i.DatasetId == datasetId);
        if (hasImages)
        {
            throw new ConflictProblemException("not-empty", $"No se puede eliminar el dataset con ID {datasetId} porque contiene imágenes registradas.");
        }

        var classes = await _db.LabelClasses.Where(c => c.DatasetId == datasetId).ToListAsync();
        if (classes.Count > 0)
        {
            _db.LabelClasses.RemoveRange(classes);
        }

        _db.Datasets.Remove(dataset);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Dataset '{Name}' (ID: {DatasetId}) eliminado exitosamente.", dataset.Name, dataset.Id);

        return NoContent();
    }
}
