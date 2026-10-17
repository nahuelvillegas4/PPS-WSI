namespace Pps.Api.Controllers.Users.Dtos;

using System.ComponentModel.DataAnnotations;

public class UpdateUserRequest : IValidatableObject
{
    [RegularExpression("^(admin|annotator)$", ErrorMessage = "The role must be either 'admin' or 'annotator'.")]
    public string? Role { get; set; }

    public bool? IsActive { get; set; }

    [StringLength(256, MinimumLength = 12, ErrorMessage = "The password must be between 12 and 256 characters.")]
    public string? Password { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Role == null && IsActive == null && Password == null)
        {
            yield return new ValidationResult(
                "At least one property (role, isActive, or password) must be provided.",
                new[] { nameof(Role), nameof(IsActive), nameof(Password) });
        }
    }
}
