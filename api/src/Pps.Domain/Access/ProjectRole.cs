namespace Pps.Domain.Access;

/// <summary>
/// Rol de un usuario dentro de un proyecto (ADR-15). Es una escalera: cada rol incluye los permisos
/// de los anteriores y se compara por su valor numérico.
/// </summary>
public enum ProjectRole
{
    Viewer = 1,
    Annotator = 2,
    ProjectAdmin = 3
}

/// <summary>
/// Valores de cable de <see cref="ProjectRole"/> ("viewer", "annotator", "project-admin"), tal como
/// los define el contrato (<c>ProjectRole</c>) y como se guardan en <c>project_members.role</c>.
/// </summary>
public static class ProjectRoles
{
    private const string ViewerWire = "viewer";
    private const string AnnotatorWire = "annotator";
    private const string ProjectAdminWire = "project-admin";

    /// <summary>Todos los valores de cable, en orden de escalera (de menor a mayor).</summary>
    public static readonly IReadOnlyList<string> All = new[] { ViewerWire, AnnotatorWire, ProjectAdminWire };

    public static string ToWire(ProjectRole role) => role switch
    {
        ProjectRole.Viewer => ViewerWire,
        ProjectRole.Annotator => AnnotatorWire,
        ProjectRole.ProjectAdmin => ProjectAdminWire,
        _ => throw new ArgumentOutOfRangeException(nameof(role), role, "Rol de proyecto desconocido.")
    };

    /// <summary>Interpreta un valor de cable exacto (distingue mayúsculas); <c>null</c> o desconocido devuelve <c>false</c>.</summary>
    public static bool TryParse(string? wire, out ProjectRole role)
    {
        switch (wire)
        {
            case ViewerWire:
                role = ProjectRole.Viewer;
                return true;
            case AnnotatorWire:
                role = ProjectRole.Annotator;
                return true;
            case ProjectAdminWire:
                role = ProjectRole.ProjectAdmin;
                return true;
            default:
                role = default;
                return false;
        }
    }

    /// <summary>
    /// Valores de cable de los roles iguales o superiores a <paramref name="minimum"/>, para consultas con
    /// <c>Contains</c>. Nunca se comparan roles en SQL: el orden alfabético de los textos no es la escalera.
    /// </summary>
    public static IReadOnlyList<string> AtLeast(ProjectRole minimum)
    {
        return All
            .Where(wire => TryParse(wire, out var role) && role >= minimum)
            .ToArray();
    }
}
