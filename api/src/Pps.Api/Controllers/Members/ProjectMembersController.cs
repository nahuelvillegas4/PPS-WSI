namespace Pps.Api.Controllers.Members;

using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Access;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Members.Dtos;
using Pps.Domain.Access;
using Pps.Infrastructure.Persistence;

/// <summary>
/// Asignación de usuarios existentes a un proyecto con un rol (ADR-15). No crea cuentas: eso es del administrador global.
/// Todas las operaciones exigen <see cref="Permission.MemberManage"/> (administrador del proyecto o administrador global).
/// </summary>
[ApiController]
[Route("api/v1/projects/{projectId:long}/members")]
[Produces("application/json")]
[Tags("members")]
public class ProjectMembersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILogger<ProjectMembersController> _logger;

    public ProjectMembersController(AppDbContext db, ILogger<ProjectMembersController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Lista los miembros del proyecto con su rol.
    /// </summary>
    [HttpGet]
    [RequirePermission(Permission.MemberManage)]
    [ProducesResponseType(typeof(ProjectMemberListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectMemberListResponse>> ListMembers(
        [FromRoute] long projectId,
        CancellationToken cancellationToken)
    {
        await EnsureProjectExistsAsync(projectId, cancellationToken);

        var members = await _db.ProjectMembers
            .AsNoTracking()
            .Where(m => m.ProjectId == projectId)
            .OrderBy(m => m.User!.Username)
            .Select(m => new { m.UserId, m.User!.Username, m.Role, m.User.IsActive, m.CreatedAt })
            .ToListAsync(cancellationToken);

        return Ok(new ProjectMemberListResponse
        {
            Items = members
                .Select(m => new ProjectMemberResponse
                {
                    UserId = m.UserId,
                    Username = m.Username,
                    Role = ProjectRoles.ToWire(m.Role),
                    IsActive = m.IsActive,
                    CreatedAt = m.CreatedAt
                })
                .ToList()
        });
    }

    /// <summary>
    /// Asigna un rol a un usuario existente, indicado por su nombre exacto. Un nombre inexistente, de un usuario
    /// inactivo, de sistema o administrador global responde siempre 404 user-not-found (no revela qué cuentas existen).
    /// 409 already-member si ya es miembro: para cambiar su rol se usa PATCH.
    /// </summary>
    [HttpPost]
    [RequirePermission(Permission.MemberManage)]
    [ProducesResponseType(typeof(ProjectMemberResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProjectMemberResponse>> AddMember(
        [FromRoute] long projectId,
        [FromBody] AddProjectMemberRequest request,
        CancellationToken cancellationToken)
    {
        var callerId = GetCurrentUserId();
        var role = ParseRole(request.Role);

        await EnsureProjectExistsAsync(projectId, cancellationToken);

        var target = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                u => u.Username == request.Username && u.IsActive && !u.IsSystem && u.Role != GlobalRoles.Admin,
                cancellationToken);

        if (target is null)
        {
            throw new NotFoundProblemException("No se encontró un usuario asignable con ese nombre.", "user-not-found");
        }

        var alreadyMember = await _db.ProjectMembers
            .AnyAsync(m => m.ProjectId == projectId && m.UserId == target.Id, cancellationToken);
        if (alreadyMember)
        {
            throw AlreadyMember(target.Username);
        }

        var now = DateTime.UtcNow;
        var member = new ProjectMember
        {
            ProjectId = projectId,
            UserId = target.Id,
            Role = role,
            CreatedAt = now,
            UpdatedAt = now,
            GrantedByUserId = callerId
        };

        _db.ProjectMembers.Add(member);
        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Dos altas simultáneas del mismo usuario: la clave primaria (project_id, user_id) rechaza la segunda.
            // Se verifica sin depender del proveedor (PostgreSQL 23505 o la restricción equivalente de SQLite).
            _db.Entry(member).State = EntityState.Detached;
            var nowMember = await _db.ProjectMembers
                .AsNoTracking()
                .AnyAsync(m => m.ProjectId == projectId && m.UserId == target.Id, cancellationToken);
            if (nowMember)
            {
                throw AlreadyMember(target.Username);
            }

            throw;
        }

        _logger.LogInformation(
            "Usuario '{Username}' (ID: {UserId}) asignado al proyecto {ProjectId} con rol {Role} por el usuario {CallerId}.",
            target.Username, target.Id, projectId, ProjectRoles.ToWire(role), callerId);

        return Created(
            $"/api/v1/projects/{projectId}/members/{target.Id}",
            MapToResponse(member, target.Username, target.IsActive));
    }

    /// <summary>
    /// Cambia el rol de un miembro. 404 si el usuario no es miembro del proyecto.
    /// </summary>
    [HttpPatch("{userId:long}")]
    [RequirePermission(Permission.MemberManage)]
    [ProducesResponseType(typeof(ProjectMemberResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProjectMemberResponse>> UpdateMember(
        [FromRoute] long projectId,
        [FromRoute] long userId,
        [FromBody] UpdateProjectMemberRequest request,
        CancellationToken cancellationToken)
    {
        var role = ParseRole(request.Role);

        await EnsureProjectExistsAsync(projectId, cancellationToken);

        var member = await _db.ProjectMembers
            .Include(m => m.User)
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken);

        if (member is null)
        {
            throw NotAMember(projectId, userId);
        }

        member.Role = role;
        member.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Rol del usuario {UserId} en el proyecto {ProjectId} cambiado a {Role}.",
            userId, projectId, ProjectRoles.ToWire(role));

        return Ok(MapToResponse(member, member.User!.Username, member.User.IsActive));
    }

    /// <summary>
    /// Quita al usuario del proyecto. Sus anotaciones se conservan (solo su autor puede editarlas, ADR-07).
    /// 404 si el usuario no es miembro del proyecto.
    /// </summary>
    [HttpDelete("{userId:long}")]
    [RequirePermission(Permission.MemberManage)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveMember(
        [FromRoute] long projectId,
        [FromRoute] long userId,
        CancellationToken cancellationToken)
    {
        await EnsureProjectExistsAsync(projectId, cancellationToken);

        var member = await _db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, cancellationToken);

        if (member is null)
        {
            throw NotAMember(projectId, userId);
        }

        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Usuario {UserId} quitado del proyecto {ProjectId}.", userId, projectId);

        return NoContent();
    }

    private async Task EnsureProjectExistsAsync(long projectId, CancellationToken cancellationToken)
    {
        var exists = await _db.Projects.AnyAsync(p => p.Id == projectId, cancellationToken);
        if (!exists)
        {
            throw new NotFoundProblemException($"No se encontró el proyecto con ID {projectId}.");
        }
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

    private static ProjectRole ParseRole(string wire)
    {
        if (!ProjectRoles.TryParse(wire, out var role))
        {
            throw new ValidationProblemException(
                $"El rol de proyecto debe ser uno de: {string.Join(", ", ProjectRoles.All)}.");
        }

        return role;
    }

    private static ConflictProblemException AlreadyMember(string username) =>
        new("already-member", $"El usuario '{username}' ya es miembro del proyecto. Para cambiar su rol, actualice la membresía.");

    private static NotFoundProblemException NotAMember(long projectId, long userId) =>
        new($"El usuario con ID {userId} no es miembro del proyecto {projectId}.");

    private static ProjectMemberResponse MapToResponse(ProjectMember member, string username, bool isActive) => new()
    {
        UserId = member.UserId,
        Username = username,
        Role = ProjectRoles.ToWire(member.Role),
        IsActive = isActive,
        CreatedAt = member.CreatedAt
    };
}
