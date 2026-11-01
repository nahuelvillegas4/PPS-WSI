namespace Pps.Api.Controllers.Members.Dtos;

using System.ComponentModel.DataAnnotations;

public class AddProjectMemberRequest
{
    [Required(ErrorMessage = "The username field is required.")]
    [RegularExpression("^[a-z0-9._-]{3,64}$", ErrorMessage = "The username must contain only lowercase letters, digits, dots, underscores or hyphens, between 3 and 64 characters.")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "The role field is required.")]
    [ProjectRoleValue]
    public string Role { get; set; } = string.Empty;
}
