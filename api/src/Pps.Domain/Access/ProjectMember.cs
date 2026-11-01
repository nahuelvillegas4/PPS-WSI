namespace Pps.Domain.Access;

using Pps.Domain.Auth;
using Pps.Domain.Catalog;

/// <summary>
/// Asignación de un usuario a un proyecto con un rol (ADR-15). La clave primaria es (ProjectId, UserId).
/// No hereda de <c>BaseEntity</c> y las navegaciones son de un solo sentido: ni <see cref="Project"/> ni
/// <see cref="User"/> conocen la membresía.
/// </summary>
public sealed class ProjectMember
{
    public long ProjectId { get; set; }
    public long UserId { get; set; }
    public ProjectRole Role { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Quién otorgó la membresía (rastro de auditoría); <c>null</c> si no se conoce.</summary>
    public long? GrantedByUserId { get; set; }

    public Project? Project { get; set; }
    public User? User { get; set; }
}
