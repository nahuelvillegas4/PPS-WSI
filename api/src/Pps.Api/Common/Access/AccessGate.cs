namespace Pps.Api.Common.Access;

using System.Security.Claims;
using Pps.Api.Common.Errors;
using Pps.Domain.Access;

/// <inheritdoc cref="IAccessGate"/>
public sealed class AccessGate : IAccessGate
{
    /// <summary>
    /// Mensaje único para "el recurso no existe" y "no sos miembro": que sean indistinguibles evita revelar
    /// qué proyectos existen (ADR-16).
    /// </summary>
    public const string NotFoundDetail = "No se encontró el recurso solicitado.";

    public const string ForbiddenDetail = "No tiene permiso para realizar esta operación en el proyecto.";

    private readonly IProjectAccessReader _reader;

    public AccessGate(IProjectAccessReader reader)
    {
        _reader = reader;
    }

    public async Task<(long ProjectId, ProjectRole EffectiveRole)> EnsureAsync(
        ClaimsPrincipal user,
        Permission permission,
        ScopeRef scope,
        CancellationToken ct)
    {
        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!long.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthenticatedProblemException("Sesión no válida o ausente.");
        }

        var facts = await _reader.FindScopeAsync(userId, scope, ct);
        var decision = AccessPolicy.Decide(user.IsInRole(GlobalRoles.Admin), permission, facts);

        switch (decision.Verdict)
        {
            case AccessVerdict.Allowed:
                return (decision.ProjectId!.Value, decision.EffectiveRole!.Value);
            case AccessVerdict.Denied:
                throw new ForbiddenProblemException(ForbiddenDetail);
            default:
                throw new NotFoundProblemException(NotFoundDetail);
        }
    }
}
