namespace Pps.Api.Common.Access;

using System.Security.Claims;
using Pps.Domain.Access;

/// <summary>
/// Puerta única de autorización por proyecto (ADR-16): combina los hechos de membresía que lee
/// <see cref="IProjectAccessReader"/> con la política pura <see cref="AccessPolicy"/>.
/// </summary>
public interface IAccessGate
{
    /// <summary>
    /// Devuelve el proyecto del recurso y el rol efectivo del usuario si el permiso está concedido.
    /// Lanza <c>NotFoundProblemException</c> (mismo mensaje si el recurso no existe o si el usuario no es miembro)
    /// o <c>ForbiddenProblemException</c> (rol insuficiente).
    /// </summary>
    Task<(long ProjectId, ProjectRole EffectiveRole)> EnsureAsync(
        ClaimsPrincipal user,
        Permission permission,
        ScopeRef scope,
        CancellationToken ct);
}
