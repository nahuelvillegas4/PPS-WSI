namespace Pps.Domain.Access;

/// <summary>Tipo de recurso a partir del cual se deduce el proyecto al que pertenece una operación.</summary>
public enum ScopeKind
{
    Project,
    Dataset,
    Class,
    Image,
    Annotation
}

/// <summary>Referencia a un recurso concreto (por ejemplo, el dataset 7).</summary>
public readonly record struct ScopeRef(ScopeKind Kind, long Id);

/// <summary>
/// Hechos que necesita la política: el proyecto al que pertenece el recurso y el rol del usuario en él.
/// <paramref name="MemberRole"/> es <c>null</c> cuando el usuario no es miembro del proyecto.
/// </summary>
public sealed record ScopeFacts(long ProjectId, ProjectRole? MemberRole);
