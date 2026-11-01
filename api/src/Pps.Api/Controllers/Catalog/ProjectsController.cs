namespace Pps.Api.Controllers.Catalog;

using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Access;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Catalog.Dtos;
using Pps.Domain.Access;
using Pps.Domain.Catalog;
using Pps.Infrastructure.Persistence;

[ApiController]
[Route("api/v1/projects")]
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
    /// Lista los proyectos visibles para la sesión: todos para el administrador global; para el resto, solo
    /// aquellos de los que es miembro. Cada proyecto incluye el rol de la sesión (<c>myRole</c>).
    /// </summary>
    [HttpGet]
    [AuthenticatedOnly]
    [ProducesResponseType(typeof(ProjectListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ProjectListResponse>> ListProjects()
    {
        if (User.IsInRole(GlobalRoles.Admin))
        {
            var all = await _db.Projects
                .AsNoTracking()
                .OrderBy(p => p.Id)
                .ToListAsync();

            return Ok(new ProjectListResponse
            {
                Items = all.Select(p => MapToResponse(p, ProjectRole.ProjectAdmin)).ToList()
            });
        }

        var userId = GetCurrentUserId();
        var memberships = await _db.ProjectMembers
            .AsNoTracking()
            .Where(m => m.UserId == userId)
            .OrderBy(m => m.ProjectId)
            .Select(m => new { m.Project!.Id, m.Project.Name, m.Project.Description, m.Project.CreatedAt, m.Role })
            .ToListAsync();

        return Ok(new ProjectListResponse
        {
            Items = memberships
                .Select(m => new ProjectResponse
                {
                    Id = m.Id,
                    Name = m.Name,
                    Description = m.Description,
                    CreatedAt = m.CreatedAt,
                    MyRole = ProjectRoles.ToWire(m.Role)
                })
                .ToList()
        });
    }

    /// <summary>
    /// Crea un nuevo proyecto. Solo el administrador global.
    /// </summary>
    [HttpPost]
    [RequireGlobalAdmin]
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

        // Quien crea un proyecto es el administrador global: es project-admin implícito.
        return Created($"/api/v1/projects/{project.Id}", MapToResponse(project, ProjectRole.ProjectAdmin));
    }

    /// <summary>
    /// Obtiene un proyecto por su identificador. Requiere ser miembro (mínimo viewer) o administrador global.
    /// </summary>
    [HttpGet("{projectId:long}")]
    [RequirePermission(Permission.ProjectView)]
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

        ProjectRole myRole;
        if (User.IsInRole(GlobalRoles.Admin))
        {
            myRole = ProjectRole.ProjectAdmin;
        }
        else
        {
            var userId = GetCurrentUserId();
            var memberRole = await _db.ProjectMembers
                .AsNoTracking()
                .Where(m => m.ProjectId == projectId && m.UserId == userId)
                .Select(m => (ProjectRole?)m.Role)
                .FirstOrDefaultAsync();

            if (memberRole is not { } role)
            {
                // El filtro de acceso ya oculta los proyectos ajenos; esto solo cubre una llamada que lo evite.
                throw new NotFoundProblemException($"No se encontró el proyecto con ID {projectId}.");
            }

            myRole = role;
        }

        return Ok(MapToResponse(project, myRole));
    }

    /// <summary>
    /// Actualiza el nombre o descripción de un proyecto. Solo el administrador global.
    /// </summary>
    [HttpPatch("{projectId:long}")]
    [RequireGlobalAdmin]
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

        return Ok(MapToResponse(project, ProjectRole.ProjectAdmin));
    }

    /// <summary>
    /// Elimina un proyecto. Solo el administrador global. Falla con 409 si contiene datasets (ADR-07).
    /// </summary>
    [HttpDelete("{projectId:long}")]
    [RequireGlobalAdmin]
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

    private long GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!long.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthenticatedProblemException("Sesión no válida o ausente.");
        }

        return userId;
    }

    private static ProjectResponse MapToResponse(Project project, ProjectRole myRole) => new()
    {
        Id = project.Id,
        Name = project.Name,
        Description = project.Description,
        CreatedAt = project.CreatedAt,
        MyRole = ProjectRoles.ToWire(myRole)
    };
}
