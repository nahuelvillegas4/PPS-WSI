namespace Pps.Api.Controllers.Auth;

using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Errors;
using Pps.Api.Common.Security;
using Pps.Api.Controllers.Auth.Dtos;
using Pps.Domain.Auth;
using Pps.Infrastructure.Persistence;

[ApiController]
[Route("api/v1/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly ILoginAttemptTracker _attemptTracker;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        AppDbContext db,
        IPasswordHasher<User> passwordHasher,
        ILoginAttemptTracker attemptTracker,
        ILogger<AuthController> logger)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _attemptTracker = attemptTracker;
        _logger = logger;
    }

    /// <summary>
    /// Inicia sesión y emite la cookie de sesión gia_session (ADR-04).
    /// </summary>
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // 1. Verificación de tasa de intentos fallidos (ADR-04)
        if (_attemptTracker.IsBlocked(request.Username))
        {
            _logger.LogWarning("Intento de inicio de sesión bloqueado por exceso de intentos para el usuario '{Username}'", request.Username);
            throw new TooManyRequestsProblemException("Demasiados intentos fallidos de inicio de sesión. Por favor, intente más tarde.");
        }

        // 2. Búsqueda de usuario activo
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Username == request.Username);

        if (user == null || !user.IsActive || user.IsSystem)
        {
            _attemptTracker.RecordFailedAttempt(request.Username);
            _logger.LogWarning("Inicio de sesión fallido: usuario '{Username}' no existe o está inactivo.", request.Username);
            throw new UnauthenticatedProblemException("Credenciales inválidas.");
        }

        // 3. Verificación de contraseña PBKDF2
        var verificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verificationResult == PasswordVerificationResult.Failed)
        {
            _attemptTracker.RecordFailedAttempt(request.Username);
            _logger.LogWarning("Inicio de sesión fallido: contraseña incorrecta para usuario '{Username}'.", request.Username);
            throw new UnauthenticatedProblemException("Credenciales inválidas.");
        }

        // 4. Éxito: resetear contador de intentos y emitir cookie de sesión
        _attemptTracker.ResetAttempts(request.Username);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Role, user.Role)
        };

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        var authProperties = new AuthenticationProperties
        {
            IsPersistent = true,
            ExpiresUtc = DateTimeOffset.UtcNow.AddHours(8),
            AllowRefresh = true
        };

        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, authProperties);

        _logger.LogInformation("Inicio de sesión exitoso para usuario '{Username}' (ID: {UserId}, Rol: {Role})",
            user.Username, user.Id, user.Role);

        return NoContent();
    }

    /// <summary>
    /// Cierra la sesión revocando la cookie gia_session.
    /// </summary>
    [HttpPost("logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    /// <summary>
    /// Obtiene la información del usuario de la sesión actual.
    /// </summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(CurrentUserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<CurrentUserResponse>> GetCurrentUser()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !long.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthenticatedProblemException("Sesión no válida o ausente.");
        }

        var user = await _db.Users.FindAsync(userId);
        if (user == null || !user.IsActive)
        {
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            throw new UnauthenticatedProblemException("El usuario ya no existe o se encuentra inactivo.");
        }

        return Ok(new CurrentUserResponse
        {
            Id = user.Id,
            Username = user.Username,
            Role = user.Role
        });
    }
}
