namespace Pps.Api.Controllers.Catalog.Dtos;

public class DatasetResponse
{
    public long Id { get; set; }
    public long ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DatasetListResponse
{
    public List<DatasetResponse> Items { get; set; } = new();
}
