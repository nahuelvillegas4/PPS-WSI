namespace Pps.Api.Controllers.Catalog.Dtos;

using System.ComponentModel.DataAnnotations;

public class LabelClassInput
{
    [Required(ErrorMessage = "The name field is required.")]
    [StringLength(64, MinimumLength = 1, ErrorMessage = "The name must be between 1 and 64 characters.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "The color field is required.")]
    [RegularExpression(@"^#[0-9a-fA-F]{6}$", ErrorMessage = "The color must be a valid hex color in format #RRGGBB.")]
    public string Color { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "The displayOrder must be greater than or equal to 0.")]
    public int? DisplayOrder { get; set; }
}
