namespace Pps.Domain.Catalog;

using Pps.Domain.Common;
using Pps.Domain.Images;

public class Dataset : BaseEntity
{
    public long ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<LabelClass> Classes { get; set; } = new List<LabelClass>();
    public ICollection<MedicalImage> Images { get; set; } = new List<MedicalImage>();
}
