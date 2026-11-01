namespace Pps.Domain.Access;

/// <summary>Resultado de la política: <see cref="Hidden"/> se responde 404 y <see cref="Denied"/> se responde 403.</summary>
public enum AccessVerdict
{
    Allowed,
    Hidden,
    Denied
}

/// <summary>
/// Decisión de acceso. <paramref name="EffectiveRole"/> y <paramref name="ProjectId"/> solo se informan
/// cuando el recurso es visible para el usuario (<see cref="AccessVerdict.Allowed"/> o <see cref="AccessVerdict.Denied"/>).
/// </summary>
public readonly record struct AccessDecision(AccessVerdict Verdict, ProjectRole? EffectiveRole, long? ProjectId);

/// <summary>
/// Política de autorización por proyecto (ADR-16). Es pura: no depende de EF ni de ASP.NET,
/// de modo que decide igual en la API, en las pruebas y en <c>tile-access</c>.
/// </summary>
public static class AccessPolicy
{
    /// <summary>
    /// <paramref name="facts"/> es <c>null</c> cuando el recurso no existe (o está borrado lógicamente) y se oculta.
    /// El administrador global actúa como <see cref="ProjectRole.ProjectAdmin"/> en todo proyecto existente.
    /// Sin membresía el recurso se oculta; con un rol menor al mínimo del permiso se deniega.
    /// </summary>
    public static AccessDecision Decide(bool isGlobalAdmin, Permission permission, ScopeFacts? facts)
    {
        if (facts is null)
        {
            return new AccessDecision(AccessVerdict.Hidden, null, null);
        }

        if (isGlobalAdmin)
        {
            return new AccessDecision(AccessVerdict.Allowed, ProjectRole.ProjectAdmin, facts.ProjectId);
        }

        if (facts.MemberRole is not { } role)
        {
            return new AccessDecision(AccessVerdict.Hidden, null, null);
        }

        var verdict = role >= PermissionMatrix.MinimumRole(permission)
            ? AccessVerdict.Allowed
            : AccessVerdict.Denied;
        return new AccessDecision(verdict, role, facts.ProjectId);
    }
}
