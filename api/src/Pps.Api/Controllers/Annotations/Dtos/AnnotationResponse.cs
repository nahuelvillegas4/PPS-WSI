namespace Pps.Api.Controllers.Annotations.Dtos;

using System.Text.Json.Serialization;
using Pps.Domain.Annotations;

public class AnnotationResponse
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("imageId")]
    public long ImageId { get; set; }

    [JsonPropertyName("classId")]
    public long ClassId { get; set; }

    [JsonPropertyName("authorId")]
    public long AuthorId { get; set; }

    [JsonPropertyName("authorUsername")]
    public string AuthorUsername { get; set; } = string.Empty;

    [JsonPropertyName("source")]
    public string Source { get; set; } = "manual";

    [JsonPropertyName("geometry")]
    public Geometry Geometry { get; set; } = null!;

    [JsonPropertyName("createdAt")]
    public DateTime CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [JsonPropertyName("version")]
    public long Version { get; set; }
}
