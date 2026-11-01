namespace Pps.Api.Controllers.Catalog.Dtos;

public class ProjectResponse
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Rol de la sesión en el proyecto ("project-admin", "annotator" o "viewer"). Solo de lectura: lo calcula el servidor
    /// y el administrador global recibe "project-admin" en todos los proyectos.
    /// </summary>
    public string MyRole { get; set; } = string.Empty;
}

public class ProjectListResponse
{
    public List<ProjectResponse> Items { get; set; } = new();
}
