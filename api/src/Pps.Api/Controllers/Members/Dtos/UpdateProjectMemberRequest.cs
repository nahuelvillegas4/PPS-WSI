namespace Pps.Api.Controllers.Members.Dtos;

using System.ComponentModel.DataAnnotations;

public class UpdateProjectMemberRequest
{
    [Required(ErrorMessage = "The role field is required.")]
    [ProjectRoleValue]
    public string Role { get; set; } = string.Empty;
}
