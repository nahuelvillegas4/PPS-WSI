namespace Pps.Api.Controllers.Images.Dtos;

using System.ComponentModel.DataAnnotations;

public class RegisterImagesRequest : IValidatableObject
{
    [Required(ErrorMessage = "The storageKeys field is required.")]
    [MinLength(1, ErrorMessage = "At least one storage key must be provided.")]
    [MaxLength(2000, ErrorMessage = "A maximum of 2000 storage keys can be registered in a single batch.")]
    public List<string> StorageKeys { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (StorageKeys.Any(string.IsNullOrWhiteSpace))
        {
            yield return new ValidationResult(
                "Storage keys cannot be empty or contain only whitespace.",
                new[] { nameof(StorageKeys) }
            );
        }

        var duplicates = StorageKeys
            .GroupBy(x => x, StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1)
            .Select(g => g.Key)
            .ToList();

        if (duplicates.Count > 0)
        {
            yield return new ValidationResult(
                $"Duplicate storage keys are not allowed in the request: {string.Join(", ", duplicates)}",
                new[] { nameof(StorageKeys) }
            );
        }
    }
}
