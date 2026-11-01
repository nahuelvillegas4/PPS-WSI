namespace Pps.Api.Controllers.Members.Dtos;

public class ProjectMemberResponse
{
    public long UserId { get; set; }
    public string Username { get; set; } = string.Empty;

    /// <summary>Rol de proyecto ("viewer", "annotator" o "project-admin").</summary>
    public string Role { get; set; } = string.Empty;

    /// <summary>Estado de la cuenta del usuario (no de la membresía).</summary>
    public bool IsActive { get; set; }

    /// <summary>Fecha de alta de la membresía.</summary>
    public DateTime CreatedAt { get; set; }
}

public class ProjectMemberListResponse
{
    public List<ProjectMemberResponse> Items { get; set; } = new();
}
