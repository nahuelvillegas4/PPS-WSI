namespace Pps.Domain.Import;

using Pps.Domain.Common;
using Pps.Domain.Catalog;
using Pps.Domain.Auth;

public class ImportRecord : BaseEntity
{
    public long DatasetId { get; set; }
    public Dataset Dataset { get; set; } = null!;

    public string Format { get; set; } = string.Empty; // "cric"
    public string Source { get; set; } = string.Empty; // "cric/"

    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;

    public long ImportedById { get; set; }
    public User ImportedBy { get; set; } = null!;

    public int ImagesFound { get; set; }
    public int ImagesRegistered { get; set; }
    public int ImagesSkipped { get; set; }

    public int ClassesMatched { get; set; }
    public int ClassesCreated { get; set; }

    public int AnnotationsCreated { get; set; }
    public int AnnotationsSkipped { get; set; }

    /// <summary>
    /// Resumen detallado del reporte y advertencias en formato JSON (jsonb en PostgreSQL, ADR-09).
    /// </summary>
    public string ReportJson { get; set; } = "{}";
}
