namespace Pps.Domain.Export.Internal;

using System.Text.Json;
using System.Text.Json.Serialization;
using Pps.Domain.Annotations;

public class InternalExportDocument
{
    [JsonPropertyName("format")]
    public string Format { get; set; } = "gia-annotations";

    [JsonPropertyName("formatVersion")]
    public string FormatVersion { get; set; } = "1.0";

    [JsonPropertyName("exportedAt")]
    public string ExportedAt { get; set; } = string.Empty;

    [JsonPropertyName("exportedBy")]
    public string ExportedBy { get; set; } = string.Empty;

    [JsonPropertyName("filter")]
    public ExportFilter Filter { get; set; } = new();

    [JsonPropertyName("coordinateSystem")]
    public ExportCoordinateSystem CoordinateSystem { get; set; } = new();

    [JsonPropertyName("project")]
    public ExportNamedEntity Project { get; set; } = new();

    [JsonPropertyName("dataset")]
    public ExportNamedEntity Dataset { get; set; } = new();

    [JsonPropertyName("classes")]
    public List<ExportLabelClass> Classes { get; set; } = new();

    [JsonPropertyName("authors")]
    public List<ExportAuthor> Authors { get; set; } = new();

    [JsonPropertyName("images")]
    public List<ExportImage> Images { get; set; } = new();
}

public class ExportFilter
{
    [JsonPropertyName("authors")]
    public object Authors { get; set; } = "all"; // "all" o List<long>
}

public class ExportCoordinateSystem
{
    [JsonPropertyName("reference")]
    public string Reference { get; set; } = "level0";

    [JsonPropertyName("units")]
    public string Units { get; set; } = "px";

    [JsonPropertyName("origin")]
    public string Origin { get; set; } = "top-left-corner";

    [JsonPropertyName("yAxis")]
    public string YAxis { get; set; } = "down";
}

public class ExportNamedEntity
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class ExportLabelClass
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("color")]
    public string Color { get; set; } = string.Empty;
}

public class ExportAuthor
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("username")]
    public string Username { get; set; } = string.Empty;

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "human"; // "human" | "import"
}

public class ExportImage
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("storageKey")]
    public string StorageKey { get; set; } = string.Empty;

    [JsonPropertyName("kind")]
    public string Kind { get; set; } = "conventional"; // "wsi" | "conventional"

    [JsonPropertyName("width")]
    public int Width { get; set; }

    [JsonPropertyName("height")]
    public int Height { get; set; }

    [JsonPropertyName("mppX")]
    public double? MppX { get; set; }

    [JsonPropertyName("mppY")]
    public double? MppY { get; set; }

    [JsonPropertyName("annotations")]
    public List<ExportAnnotation> Annotations { get; set; } = new();
}

public class ExportAnnotation
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("classId")]
    public long ClassId { get; set; }

    [JsonPropertyName("authorId")]
    public long AuthorId { get; set; }

    [JsonPropertyName("source")]
    public string Source { get; set; } = "manual"; // "manual" | "import"

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;

    [JsonPropertyName("updatedAt")]
    public string UpdatedAt { get; set; } = string.Empty;

    [JsonPropertyName("geometry")]
    public Geometry Geometry { get; set; } = null!;

    [JsonPropertyName("provenance")]
    public JsonElement? Provenance { get; set; }
}
