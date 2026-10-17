namespace Pps.Api.Controllers.Catalog.Dtos;

using System.ComponentModel.DataAnnotations;

public class ProjectPatch : IValidatableObject
{
    [StringLength(120, MinimumLength = 1, ErrorMessage = "The name must be between 1 and 120 characters.")]
    public string? Name { get; set; }

    [StringLength(2000, ErrorMessage = "The description must not exceed 2000 characters.")]
    public string? Description { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Name == null && Description == null)
        {
            yield return new ValidationResult(
                "At least one property (name or description) must be provided.",
                new[] { nameof(Name), nameof(Description) });
        }
    }
}
