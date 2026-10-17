namespace Pps.Api.Controllers.Users.Dtos;

public class UserResponse
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UserListResponse
{
    public List<UserResponse> Items { get; set; } = new();
}
