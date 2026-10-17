namespace Pps.Api.Controllers.Users.Dtos;

using System.ComponentModel.DataAnnotations;

public class CreateUserRequest
{
    [Required(ErrorMessage = "The username field is required.")]
    [RegularExpression("^[a-z0-9._-]{3,64}$", ErrorMessage = "The username must contain only lowercase letters, digits, dots, underscores or hyphens, between 3 and 64 characters.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "The password field is required.")]
    [StringLength(256, MinimumLength = 12, ErrorMessage = "The password must be between 12 and 256 characters.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "The role field is required.")]
    [RegularExpression("^(admin|annotator)$", ErrorMessage = "The role must be either 'admin' or 'annotator'.")]
    public string Role { get; set; } = string.Empty;
}
