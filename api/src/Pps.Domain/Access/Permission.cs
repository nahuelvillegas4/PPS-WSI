namespace Pps.Domain.Access;

/// <summary>Permisos que se otorgan dentro de un proyecto (ADR-15, ADR-16).</summary>
public enum Permission
{
    ProjectView,
    AnnotationWrite,
    CatalogManage,
    ImageUpload,
    MemberManage,
    DatasetExport
}

/// <summary>
/// Tabla única que dice qué rol de proyecto mínimo exige cada permiso. Agregar un permiso obliga a
/// declarar su mínimo aquí: la prueba de la matriz recorre todos los valores del enum.
/// </summary>
public static class PermissionMatrix
{
    public static ProjectRole MinimumRole(Permission permission) => permission switch
    {
        Permission.ProjectView => ProjectRole.Viewer,
        Permission.AnnotationWrite => ProjectRole.Annotator,
        Permission.CatalogManage => ProjectRole.ProjectAdmin,
        Permission.ImageUpload => ProjectRole.ProjectAdmin,
        Permission.MemberManage => ProjectRole.ProjectAdmin,
        Permission.DatasetExport => ProjectRole.ProjectAdmin,
        _ => throw new ArgumentOutOfRangeException(nameof(permission), permission, "Permiso desconocido.")
    };

    /// <summary>Nombre de cable del permiso, tal como figura en <c>contract/fixtures/authorization-matrix.json</c>.</summary>
    public static string ToWire(Permission permission) => permission switch
    {
        Permission.ProjectView => "project.view",
        Permission.AnnotationWrite => "annotation.write",
        Permission.CatalogManage => "catalog.manage",
        Permission.ImageUpload => "image.upload",
        Permission.MemberManage => "member.manage",
        Permission.DatasetExport => "dataset.export",
        _ => throw new ArgumentOutOfRangeException(nameof(permission), permission, "Permiso desconocido.")
    };
}
