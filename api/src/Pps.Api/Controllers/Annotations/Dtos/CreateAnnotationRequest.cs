namespace Pps.Api.Controllers.Annotations.Dtos;

using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Pps.Domain.Annotations;

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public class CreateAnnotationRequest : IValidatableObject
{
    [Required]
    [JsonPropertyName("classId")]
    public long? ClassId { get; set; }

    [Required]
    [JsonPropertyName("geometry")]
    public Geometry? Geometry { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!ClassId.HasValue || ClassId.Value <= 0)
        {
            yield return new ValidationResult("classId debe ser un identificador positivo válido.", [nameof(ClassId)]);
        }

        if (Geometry == null)
        {
            yield return new ValidationResult("geometry es obligatoria.", [nameof(Geometry)]);
        }
        else if (Geometry is IValidatableObject validatable)
        {
            var childResults = new List<ValidationResult>();
            var childContext = new ValidationContext(Geometry, validationContext, validationContext.Items);
            Validator.TryValidateObject(validatable, childContext, childResults, validateAllProperties: true);
            foreach (var result in childResults)
            {
                yield return result;
            }
        }
    }
}
