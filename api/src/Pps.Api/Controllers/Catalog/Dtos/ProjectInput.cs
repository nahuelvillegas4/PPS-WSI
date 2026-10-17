namespace Pps.Api.Controllers.Catalog.Dtos;

using System.ComponentModel.DataAnnotations;

public class ProjectInput
{
    [Required(ErrorMessage = "The name field is required.")]
    [StringLength(120, MinimumLength = 1, ErrorMessage = "The name must be between 1 and 120 characters.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(2000, ErrorMessage = "The description must not exceed 2000 characters.")]
    public string? Description { get; set; }
}
