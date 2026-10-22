namespace Pps.Domain.Annotations;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class PolygonGeometry : Geometry, IValidatableObject
{
    [Required]
    [JsonPropertyName("points")]
    public double[][]? Points { get; set; }

    [JsonIgnore]
    public override string Type => "polygon";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Points == null || Points.Length < 3)
        {
            yield return new ValidationResult("Polygon must contain at least 3 vertices", [nameof(Points)]);
            yield break;
        }

        if (Points.Length > 10000)
        {
            yield return new ValidationResult("Polygon cannot exceed 10000 vertices", [nameof(Points)]);
            yield break;
        }

        for (int i = 0; i < Points.Length; i++)
        {
            var p = Points[i];
            if (p == null || p.Length != 2)
            {
                yield return new ValidationResult($"Vertex at index {i} must have exactly 2 coordinates [x, y]", [nameof(Points)]);
                continue;
            }

            if (double.IsNaN(p[0]) || double.IsInfinity(p[0]) || double.IsNaN(p[1]) || double.IsInfinity(p[1]))
            {
                yield return new ValidationResult($"Vertex at index {i} must contain valid finite numbers", [nameof(Points)]);
                continue;
            }

            if (p[0] < 0 || p[1] < 0)
            {
                yield return new ValidationResult($"Vertex at index {i} coordinates must be non-negative", [nameof(Points)]);
            }
        }
    }

    public override (double minX, double minY, double maxX, double maxY) ComputeBbox()
    {
        if (Points == null || Points.Length == 0) return (0, 0, 0, 0);
        double minX = Points.Min(p => p[0]);
        double minY = Points.Min(p => p[1]);
        double maxX = Points.Max(p => p[0]);
        double maxY = Points.Max(p => p[1]);
        return (minX, minY, maxX, maxY);
    }

    public override double ComputeArea()
    {
        if (Points == null || Points.Length < 3) return 0;
        return Math.Abs(GeometryValidator.ComputeSignedAreaDouble(Points)) / 2.0;
    }
}
