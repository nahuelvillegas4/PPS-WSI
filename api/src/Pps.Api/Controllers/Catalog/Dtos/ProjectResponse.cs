namespace Pps.Api.Controllers.Catalog.Dtos;

public class ProjectResponse
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProjectListResponse
{
    public List<ProjectResponse> Items { get; set; } = new();
}
