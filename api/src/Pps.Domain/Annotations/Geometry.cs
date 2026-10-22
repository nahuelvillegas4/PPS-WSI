namespace Pps.Domain.Annotations;

using System.Text.Json.Serialization;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(RectangleGeometry), "rectangle")]
[JsonDerivedType(typeof(PolygonGeometry), "polygon")]
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public abstract class Geometry
{
    [JsonIgnore]
    public abstract string Type { get; }

    public abstract (double minX, double minY, double maxX, double maxY) ComputeBbox();
    public abstract double ComputeArea();
}
