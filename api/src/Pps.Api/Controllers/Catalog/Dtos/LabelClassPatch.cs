namespace Pps.Api.Controllers.Catalog.Dtos;

using System.ComponentModel.DataAnnotations;

public class LabelClassPatch : IValidatableObject
{
    [StringLength(64, MinimumLength = 1, ErrorMessage = "The name must be between 1 and 64 characters.")]
    public string? Name { get; set; }

    [RegularExpression(@"^#[0-9a-fA-F]{6}$", ErrorMessage = "The color must be a valid hex color in format #RRGGBB.")]
    public string? Color { get; set; }

    [Range(0, int.MaxValue, ErrorMessage = "The displayOrder must be greater than or equal to 0.")]
    public int? DisplayOrder { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Name == null && Color == null && DisplayOrder == null)
        {
            yield return new ValidationResult(
                "At least one property (name, color, or displayOrder) must be provided.",
                new[] { nameof(Name), nameof(Color), nameof(DisplayOrder) });
        }
    }
}
