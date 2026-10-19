namespace Pps.Api.Controllers.Users;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Users.Dtos;
using Pps.Domain.Auth;
using Pps.Infrastructure.Persistence;

[ApiController]
[Route("api/v1/users")]
[Authorize(Roles = "admin")]
[Produces("application/json")]
public class UsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILogger<UsersController> _logger;

    public UsersController(
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        ILogger<UsersController> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    /// <summary>
    /// Lista los usuarios del sistema. Solo administradores (ADR-04).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(UserListResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<UserListResponse>> ListUsers()
    {
        var users = await _db.Users
            .Where(u => !u.IsSystem)
            .OrderBy(u => u.Id)
            .Select(u => new UserResponse
            {
                Id = u.Id,
                Username = u.Username,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();

        return Ok(new UserListResponse { Items = users });
    }

    /// <summary>
    /// Crea un nuevo usuario. Solo administradores. Sin autorregistro (ADR-04).
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserResponse>> CreateUser([FromBody] CreateUserRequest request)
    {
        var exists = await _db.Users.AnyAsync(u => u.Username == request.Username);
        if (exists)
        {
            throw new ConflictProblemException("duplicate-name", $"El usuario '{request.Username}' ya existe.");
        }

        var newUser = new User
        {
            Username = request.Username,
            Role = request.Role,
            IsActive = true,
            IsSystem = false,
            CreatedAt = DateTime.UtcNow
        };
        newUser.PasswordHash = _passwordHasher.HashPassword(newUser, request.Password);

        _db.Users.Add(newUser);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Usuario '{Username}' (ID: {UserId}, Rol: {Role}) creado exitosamente por administrador.",
            newUser.Username, newUser.Id, newUser.Role);

        var response = new UserResponse
        {
            Id = newUser.Id,
            Username = newUser.Username,
            Role = newUser.Role,
            IsActive = newUser.IsActive,
            CreatedAt = newUser.CreatedAt
        };

        return Created($"/api/v1/users/{newUser.Id}", response);
    }

    /// <summary>
    /// Obtiene un usuario específico por su ID.
    /// </summary>
    [HttpGet("{userId:long}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponse>> GetUser([FromRoute] long userId)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsSystem)
        {
            throw new NotFoundProblemException($"No se encontró el usuario con ID {userId}.");
        }

        return Ok(new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }

    /// <summary>
    /// Actualiza rol, estado o contraseña de un usuario. Solo administradores (ADR-04).
    /// </summary>
    [HttpPatch("{userId:long}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponse>> UpdateUser(
        [FromRoute] long userId,
        [FromBody] UpdateUserRequest request)
    {
        var user = await _db.Users.FindAsync(userId);
        if (user == null || user.IsSystem)
        {
            throw new NotFoundProblemException($"No se encontró el usuario con ID {userId}.");
        }

        if (!string.IsNullOrEmpty(request.Role))
        {
            user.Role = request.Role;
        }

        if (request.IsActive.HasValue)
        {
            user.IsActive = request.IsActive.Value;
        }

        if (!string.IsNullOrEmpty(request.Password))
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation("Usuario '{Username}' (ID: {UserId}) actualizado por administrador.", user.Username, user.Id);

        return Ok(new UserResponse
        {
            Id = user.Id,
            Username = user.Username,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        });
    }
}
