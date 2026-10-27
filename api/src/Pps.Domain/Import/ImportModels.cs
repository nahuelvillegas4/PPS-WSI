namespace Pps.Domain.Import;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

public class ImportRequest : IValidatableObject
{
    [Required]
    [JsonPropertyName("format")]
    public string Format { get; set; } = "cric";

    [Required]
    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    [JsonPropertyName("dryRun")]
    public bool DryRun { get; set; } = true;

    [JsonPropertyName("options")]
    public ImportOptions? Options { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.Equals(Format, "cric", StringComparison.OrdinalIgnoreCase))
        {
            yield return new ValidationResult(
                $"Formato de importación no soportado: '{Format}'. v0.1 admite únicamente 'cric'.",
                [nameof(Format)]);
        }

        if (string.IsNullOrWhiteSpace(Source))
        {
            yield return new ValidationResult("La propiedad 'source' es requerida.", [nameof(Source)]);
        }

        if (Options?.BoxSize <= 0)
        {
            yield return new ValidationResult("El valor de 'options.boxSize' debe ser estrictamente mayor a 0.", [nameof(Options)]);
        }
    }
}

public class ImportOptions
{
    [JsonPropertyName("boxSize")]
    public double BoxSize { get; set; } = 100.0;
}

public class ImportReport
{
    [JsonPropertyName("importId")]
    public long? ImportId { get; set; }

    [JsonPropertyName("dryRun")]
    public bool DryRun { get; set; }

    [JsonPropertyName("format")]
    public string Format { get; set; } = "cric";

    [JsonPropertyName("source")]
    public string Source { get; set; } = string.Empty;

    [JsonPropertyName("images")]
    public ImageCounts Images { get; set; } = new();

    [JsonPropertyName("classes")]
    public ClassCounts Classes { get; set; } = new();

    [JsonPropertyName("annotations")]
    public AnnotationCounts Annotations { get; set; } = new();

    [JsonPropertyName("warnings")]
    public List<ImportWarning> Warnings { get; set; } = [];
}

public class ImageCounts
{
    [JsonPropertyName("found")]
    public int Found { get; set; }

    [JsonPropertyName("registered")]
    public int Registered { get; set; }

    [JsonPropertyName("skipped")]
    public int Skipped { get; set; }
}

public class ClassCounts
{
    [JsonPropertyName("matched")]
    public int Matched { get; set; }

    [JsonPropertyName("created")]
    public int Created { get; set; }
}

public class AnnotationCounts
{
    [JsonPropertyName("created")]
    public int Created { get; set; }

    [JsonPropertyName("skipped")]
    public int Skipped { get; set; }
}

public class ImportWarning
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("record")]
    public string? Record { get; set; }
}

public class CricProvenance
{
    [JsonPropertyName("importId")]
    public long? ImportId { get; set; }

    [JsonPropertyName("format")]
    public string Format { get; set; } = "cric";

    [JsonPropertyName("conversion")]
    public string Conversion { get; set; } = "point-to-box";

    [JsonPropertyName("nucleus")]
    public double[] Nucleus { get; set; } = [];

    [JsonPropertyName("boxSize")]
    public double BoxSize { get; set; }

    [JsonPropertyName("sourceRecord")]
    public object? SourceRecord { get; set; }
}
