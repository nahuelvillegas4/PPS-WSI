namespace Pps.Api.Controllers.Ops;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pps.Infrastructure.Persistence;

[ApiController]
[Tags("ops")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<HealthController> _logger;

    public HealthController(AppDbContext dbContext, ILogger<HealthController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Chequeo de proceso vivo (liveness)
    /// </summary>
    [HttpGet("health/live", Name = "apiLive")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult Live()
    {
        return Ok(new { status = "live", timestamp = DateTime.UtcNow });
    }

    /// <summary>
    /// Chequeo de proceso listo: base de datos accesible y migraciones aplicadas (readiness)
    /// </summary>
    [HttpGet("health/ready", Name = "apiReady")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Ready(CancellationToken cancellationToken)
    {
        try
        {
            var canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);
            if (!canConnect)
            {
                _logger.LogWarning("HealthCheck ready: No se pudo conectar a la base de datos.");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new
                {
                    status = "not_ready",
                    reason = "Database connection failed",
                    timestamp = DateTime.UtcNow
                });
            }

            return Ok(new { status = "ready", timestamp = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HealthCheck ready: Excepción al verificar conectividad con la base de datos.");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                status = "not_ready",
                reason = ex.Message,
                timestamp = DateTime.UtcNow
            });
        }
    }
}
