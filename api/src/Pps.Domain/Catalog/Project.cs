namespace Pps.Domain.Catalog;

using Pps.Domain.Common;

public class Project : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Dataset> Datasets { get; set; } = new List<Dataset>();
}
