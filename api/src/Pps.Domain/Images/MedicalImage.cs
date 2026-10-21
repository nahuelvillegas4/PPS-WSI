namespace Pps.Domain.Images;

using Pps.Domain.Common;
using Pps.Domain.Catalog;
using Pps.Domain.Annotations;

public class MedicalImage : BaseEntity
{
    public long DatasetId { get; set; }
    public Dataset Dataset { get; set; } = null!;

    public string StorageKey { get; set; } = string.Empty;
    public string OriginalFilename { get; set; } = string.Empty;
    public string Kind { get; set; } = "wsi"; // "wsi" | "conventional"
    public string Format { get; set; } = "png"; // "svs" | "png" | "jpeg"
    public int WidthL0 { get; set; }
    public int HeightL0 { get; set; }
    public int LevelCount { get; set; } = 1;
    public double? MppX { get; set; }
    public double? MppY { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Annotation> Annotations { get; set; } = new List<Annotation>();
}
