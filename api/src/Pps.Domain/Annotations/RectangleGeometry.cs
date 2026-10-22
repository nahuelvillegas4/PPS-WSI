namespace Pps.Domain.Annotations;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class RectangleGeometry : Geometry, IValidatableObject
{
    [Required]
    [JsonPropertyName("x")]
    public double? X { get; set; }

    [Required]
    [JsonPropertyName("y")]
    public double? Y { get; set; }

    [Required]
    [JsonPropertyName("width")]
    public double? Width { get; set; }

    [Required]
    [JsonPropertyName("height")]
    public double? Height { get; set; }

    [JsonIgnore]
    public override string Type => "rectangle";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!X.HasValue)
        {
            yield return new ValidationResult("x is required", [nameof(X)]);
        }
        else if (X.Value < 0 || double.IsNaN(X.Value) || double.IsInfinity(X.Value))
        {
            yield return new ValidationResult("x must be a non-negative finite number", [nameof(X)]);
        }

        if (!Y.HasValue)
        {
            yield return new ValidationResult("y is required", [nameof(Y)]);
        }
        else if (Y.Value < 0 || double.IsNaN(Y.Value) || double.IsInfinity(Y.Value))
        {
            yield return new ValidationResult("y must be a non-negative finite number", [nameof(Y)]);
        }

        if (!Width.HasValue)
        {
            yield return new ValidationResult("width is required", [nameof(Width)]);
        }
        else if (Width.Value <= 0 || double.IsNaN(Width.Value) || double.IsInfinity(Width.Value))
        {
            yield return new ValidationResult("width must be strictly greater than 0", [nameof(Width)]);
        }

        if (!Height.HasValue)
        {
            yield return new ValidationResult("height is required", [nameof(Height)]);
        }
        else if (Height.Value <= 0 || double.IsNaN(Height.Value) || double.IsInfinity(Height.Value))
        {
            yield return new ValidationResult("height must be strictly greater than 0", [nameof(Height)]);
        }
    }

    public override (double minX, double minY, double maxX, double maxY) ComputeBbox()
    {
        double x = X ?? 0;
        double y = Y ?? 0;
        double w = Width ?? 0;
        double h = Height ?? 0;
        return (x, y, x + w, y + h);
    }

    public override double ComputeArea()
    {
        return (Width ?? 0) * (Height ?? 0);
    }
}
