namespace Pps.Api.Common.Access;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pps.Domain.Access;
using Pps.Infrastructure.Access;

public static class AccessServiceCollectionExtensions
{
    /// <summary>
    /// Registra la autorización por proyecto (ADR-16): el lector de membresía, la puerta, el filtro global
    /// <see cref="AccessGuardFilter"/> (orden -1000) y una política de respaldo que exige un usuario autenticado,
    /// de modo que un endpoint sin declaración nunca queda abierto.
    /// </summary>
    public static IServiceCollection AddAccessControl(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        services.AddScoped<IProjectAccessReader, EfProjectAccessReader>();
        services.AddScoped<IAccessGate, AccessGate>();
        services.Configure<MvcOptions>(options => options.Filters.Add<AccessGuardFilter>(AccessGuardFilter.FilterOrder));

        return services;
    }
}
