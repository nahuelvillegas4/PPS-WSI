namespace Pps.Api.Common.Access;

using Microsoft.AspNetCore.Authorization;
using Pps.Domain.Access;

/// <summary>
/// La operación exige un permiso de proyecto. El proyecto se deduce de la ruta: la acción debe tener
/// exactamente una clave de ámbito entre <see cref="AccessScopeKeys.All"/>.
/// Quien no es miembro del proyecto (o el recurso no existe) recibe 404; con rol insuficiente, 403.
/// No hereda de <see cref="AuthorizeAttribute"/>: la autenticación la exige la política de respaldo
/// (<c>FallbackPolicy</c>) y la decisión de proyecto la toma <see cref="AccessGuardFilter"/>.
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequirePermissionAttribute : Attribute, IAccessDeclaration
{
    public RequirePermissionAttribute(Permission permission)
    {
        Permission = permission;
    }

    public Permission Permission { get; }
}

/// <summary>Solo el administrador global (rol <c>admin</c>); el framework responde 401 o 403.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequireGlobalAdminAttribute : AuthorizeAttribute, IAccessDeclaration
{
    public RequireGlobalAdminAttribute()
    {
        Roles = GlobalRoles.Admin;
    }
}

/// <summary>Cualquier usuario autenticado. La operación no tiene ámbito de proyecto o aplica su permiso a mano.</summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class AuthenticatedOnlyAttribute : AuthorizeAttribute, IAccessDeclaration
{
}
