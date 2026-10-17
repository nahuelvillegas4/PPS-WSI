namespace Pps.Api.Controllers.Catalog.Dtos;

public class LabelClassResponse
{
    public long Id { get; set; }
    public long DatasetId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}

public class LabelClassListResponse
{
    public List<LabelClassResponse> Items { get; set; } = new();
}
