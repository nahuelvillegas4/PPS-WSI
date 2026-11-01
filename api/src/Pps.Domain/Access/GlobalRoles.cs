namespace Pps.Domain.Access;

/// <summary>
/// Roles globales de un usuario (<c>users.role</c>, ADR-15). El administrador global actúa como
/// administrador de proyecto en todos los proyectos; los demás usuarios solo ven aquellos donde son miembros.
/// </summary>
public static class GlobalRoles
{
    public const string Admin = "admin";
    public const string User = "user";

    public static readonly IReadOnlyList<string> All = new[] { Admin, User };

    /// <summary>Expresión regular para validar el valor de cable de un rol global.</summary>
    public const string Pattern = "^(admin|user)$";
}
