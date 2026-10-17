namespace Pps.Api.Controllers.Auth.Dtos;

using System.ComponentModel.DataAnnotations;

public class LoginRequest
{
    [Required(ErrorMessage = "The username field is required.")]
    [StringLength(64, MinimumLength = 1, ErrorMessage = "The username must be between 1 and 64 characters.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "The password field is required.")]
    [StringLength(256, MinimumLength = 1, ErrorMessage = "The password must be between 1 and 256 characters.")]
    public string Password { get; set; } = string.Empty;
}
