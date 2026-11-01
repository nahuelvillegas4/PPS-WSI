namespace Pps.Infrastructure.Access;

using Microsoft.EntityFrameworkCore;
using Pps.Domain.Access;
using Pps.Infrastructure.Persistence;

/// <summary>
/// Adaptador EF del puerto <see cref="IProjectAccessReader"/> (ADR-16). Cada llamada es una sola consulta
/// de solo lectura: se proyecta el recurso hasta su <c>ProjectId</c> y el rol del usuario sale de una
/// subconsulta correlacionada por la clave primaria de <c>project_members</c>.
/// </summary>
public sealed class EfProjectAccessReader : IProjectAccessReader
{
    private readonly AppDbContext _db;

    public EfProjectAccessReader(AppDbContext db)
    {
        _db = db;
    }

    public async Task<ScopeFacts?> FindScopeAsync(long userId, ScopeRef scope, CancellationToken ct)
    {
        // Las anotaciones borradas lógicamente quedan fuera por el filtro global de Annotation: cuentan como inexistentes.
        IQueryable<long> projectIds = scope.Kind switch
        {
            ScopeKind.Project => _db.Projects.Where(p => p.Id == scope.Id).Select(p => p.Id),
            ScopeKind.Dataset => _db.Datasets.Where(d => d.Id == scope.Id).Select(d => d.ProjectId),
            ScopeKind.Class => _db.LabelClasses.Where(c => c.Id == scope.Id).Select(c => c.Dataset.ProjectId),
            ScopeKind.Image => _db.Images.Where(i => i.Id == scope.Id).Select(i => i.Dataset.ProjectId),
            ScopeKind.Annotation => _db.Annotations.Where(a => a.Id == scope.Id).Select(a => a.Dataset.ProjectId),
            _ => throw new ArgumentOutOfRangeException(nameof(scope), scope.Kind, "Tipo de recurso desconocido.")
        };

        // Rol del usuario en el proyecto: subconsulta correlacionada por la clave primaria (project_id, user_id),
        // que EF inlinea en la misma SQL. Es null si el usuario no es miembro.
        var row = await projectIds
            .Select(projectId => new ScopeRow(
                projectId,
                _db.ProjectMembers
                    .Where(m => m.ProjectId == projectId && m.UserId == userId)
                    .Select(m => (ProjectRole?)m.Role)
                    .FirstOrDefault()))
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);

        return row is null ? null : new ScopeFacts(row.ProjectId, row.MemberRole);
    }

    public async Task<TileAccessFacts?> FindImageForTileAsync(long userId, long imageId, CancellationToken ct)
    {
        var row = await _db.Images
            .Where(i => i.Id == imageId)
            .Select(i => new TileRow(
                i.StorageKey,
                _db.Users.Where(u => u.Id == userId).Select(u => u.IsActive).FirstOrDefault(),
                i.Dataset.ProjectId,
                _db.ProjectMembers
                    .Where(m => m.ProjectId == i.Dataset.ProjectId && m.UserId == userId)
                    .Select(m => (ProjectRole?)m.Role)
                    .FirstOrDefault()))
            .AsNoTracking()
            .FirstOrDefaultAsync(ct);

        return row is null
            ? null
            : new TileAccessFacts(row.StorageKey, row.UserIsActive, new ScopeFacts(row.ProjectId, row.MemberRole));
    }

    private sealed record ScopeRow(long ProjectId, ProjectRole? MemberRole);

    private sealed record TileRow(string StorageKey, bool UserIsActive, long ProjectId, ProjectRole? MemberRole);
}
