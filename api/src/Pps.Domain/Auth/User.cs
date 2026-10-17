namespace Pps.Domain.Auth;

using Pps.Domain.Common;

public class User : BaseEntity
{
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "annotator"; // "admin" | "annotator" (ADR-04)
    public bool IsActive { get; set; } = true;
    public bool IsSystem { get; set; } = false; // true para usuarios sintéticos como import-cric (ADR-07)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
