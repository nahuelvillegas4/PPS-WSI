namespace Pps.Api.Controllers.Auth.Dtos;

public class CurrentUserResponse
{
    public long Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
