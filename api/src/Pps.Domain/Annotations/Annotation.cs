namespace Pps.Domain.Annotations;

using Pps.Domain.Common;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Domain.Auth;

public class Annotation : BaseEntity
{
    public long DatasetId { get; set; }
    public Dataset Dataset { get; set; } = null!;

    public long ImageId { get; set; }
    public MedicalImage Image { get; set; } = null!;

    public long ClassId { get; set; }
    public LabelClass Class { get; set; } = null!;

    public long AuthorId { get; set; }
    public User Author { get; set; } = null!;

    /// <summary>
    /// Geometría en píxeles de nivel 0 almacenada en columna jsonb (ADR-07).
    /// </summary>
    public string GeometryJson { get; set; } = "{}";

    // Caja envolvente y área precalculadas (ADR-07, §8.2)
    public double BboxMinX { get; set; }
    public double BboxMinY { get; set; }
    public double BboxMaxX { get; set; }
    public double BboxMaxY { get; set; }
    public double Area { get; set; }

    public string Source { get; set; } = "manual"; // "manual" | "import-cric" | etc.
    public string? ProvenanceJson { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; } // Borrado lógico (ADR-07)

    public uint Version { get; set; } // Token de concurrencia optimista (xmin en Postgres)
}
