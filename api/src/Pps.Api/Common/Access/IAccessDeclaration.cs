namespace Pps.Api.Common.Access;

/// <summary>
/// Marcador de las declaraciones de acceso de un endpoint (ADR-16). Cada acción de cada controlador lleva
/// exactamente una: <see cref="RequirePermissionAttribute"/>, <see cref="RequireGlobalAdminAttribute"/>,
/// <see cref="AuthenticatedOnlyAttribute"/> o <c>[AllowAnonymous]</c> (que cuenta como declaración).
/// <see cref="AccessGuardFilter"/> falla cerrado si una acción tiene cero o más de una.
/// </summary>
public interface IAccessDeclaration
{
}
