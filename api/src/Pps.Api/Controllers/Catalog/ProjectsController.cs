namespace Pps.Api.Controllers.Catalog;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Catalog.Dtos;
using Pps.Domain.Catalog;
using Pps.Infrastructure.Persistence;

[ApiController]
[Route("api/v1/projects")]
[Authorize]
[Produces("application/json")]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(AppDbContext db, ILogger<ProjectsController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Lista todos los proyectos.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ProjectListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProjectListResponse>> ListProjects()
    {
        var projects = await _db.Projects
            .OrderBy(p => p.Id)
            .Select(p => new ProjectResponse
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                CreatedAt = p.CreatedAt
            })
            .ToListAsync();

        return Ok(new ProjectListResponse { Items = projects });
    }

    /// <summary>
    /// Crea un nuevo proyecto. Solo administradores.
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProjectResponse>> CreateProject([FromBody] ProjectInput request)
    {
        var exists = await _db.Projects.AnyAsync(p => p.Name == request.Name);
        if (exists)
        {
            throw new ConflictProblemException("duplicate-name", $"Ya existe un proyecto con el nombre '{request.Name}'.");
        }

        var project = new Project
        {
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow
        };

        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Proyecto '{Name}' (ID: {ProjectId}) creado exitosamente.", project.Name, project.Id);

        var response = new ProjectResponse
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            CreatedAt = project.CreatedAt
        };

        return Created($"/api/v1/projects/{project.Id}", response);
    }

    /// <summary>
    /// Obtiene un proyecto por su identificador.
    /// </summary>
    [HttpGet("{projectId:long}")]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectResponse>> GetProject([FromRoute] long projectId)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null)
        {
            throw new NotFoundProblemException($"No se encontró el proyecto con ID {projectId}.");
        }

        return Ok(new ProjectResponse
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            CreatedAt = project.CreatedAt
        });
    }

    /// <summary>
    /// Actualiza el nombre o descripción de un proyecto. Solo administradores.
    /// </summary>
    [HttpPatch("{projectId:long}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(typeof(ProjectResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProjectResponse>> UpdateProject(
        [FromRoute] long projectId,
        [FromBody] ProjectPatch request)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null)
        {
            throw new NotFoundProblemException($"No se encontró el proyecto con ID {projectId}.");
        }

        if (!string.IsNullOrEmpty(request.Name) && request.Name != project.Name)
        {
            var nameExists = await _db.Projects.AnyAsync(p => p.Name == request.Name && p.Id != projectId);
            if (nameExists)
            {
                throw new ConflictProblemException("duplicate-name", $"Ya existe un proyecto con el nombre '{request.Name}'.");
            }
            project.Name = request.Name;
        }

        if (request.Description != null)
        {
            project.Description = request.Description;
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Proyecto ID {ProjectId} actualizado.", project.Id);

        return Ok(new ProjectResponse
        {
            Id = project.Id,
            Name = project.Name,
            Description = project.Description,
            CreatedAt = project.CreatedAt
        });
    }

    /// <summary>
    /// Elimina un proyecto. Solo administradores. Falla con 409 si contiene datasets (ADR-07).
    /// </summary>
    [HttpDelete("{projectId:long}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> DeleteProject([FromRoute] long projectId)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null)
        {
            throw new NotFoundProblemException($"No se encontró el proyecto con ID {projectId}.");
        }

        var hasDatasets = await _db.Datasets.AnyAsync(d => d.ProjectId == projectId);
        if (hasDatasets)
        {
            throw new ConflictProblemException("not-empty", $"No se puede eliminar el proyecto con ID {projectId} porque contiene datasets asociados.");
        }

        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Proyecto '{Name}' (ID: {ProjectId}) eliminado exitosamente.", project.Name, project.Id);

        return NoContent();
    }
}
