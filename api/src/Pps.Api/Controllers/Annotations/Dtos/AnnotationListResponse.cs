namespace Pps.Api.Controllers.Annotations.Dtos;

using System.Text.Json.Serialization;

public class AnnotationListResponse
{
    [JsonPropertyName("items")]
    public List<AnnotationResponse> Items { get; set; } = [];
}
