namespace Pps.Api.Common.Access;

using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Filters;
using Pps.Api.Common.Errors;
using Pps.Domain.Access;

/// <summary>
/// Filtro de autorización global (ADR-16). Corre antes del model binding y falla cerrado: cuenta las
/// declaraciones de acceso del endpoint (<see cref="IAccessDeclaration"/> más <see cref="IAllowAnonymous"/>)
/// y, si no es exactamente una, deniega con 403.
/// <list type="bullet">
/// <item><c>[RequireGlobalAdmin]</c>, <c>[AuthenticatedOnly]</c> y <c>[AllowAnonymous]</c>: el framework ya decidió (401/403), el filtro termina.</item>
/// <item><c>[RequirePermission]</c>: deduce el proyecto de la clave de ruta y pregunta a <see cref="IAccessGate"/>.</item>
/// </list>
/// Las excepciones llegan al <see cref="GiaExceptionHandler"/> igual que las de los controladores.
/// </summary>
public sealed class AccessGuardFilter : IAsyncAuthorizationFilter, IOrderedFilter
{
    /// <summary>Corre antes que cualquier otro filtro de autorización.</summary>
    public const int FilterOrder = -1000;

    private readonly IAccessGate _gate;
    private readonly ILogger<AccessGuardFilter> _logger;

    public AccessGuardFilter(IAccessGate gate, ILogger<AccessGuardFilter> logger)
    {
        _gate = gate;
        _logger = logger;
    }

    public int Order => FilterOrder;

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var metadata = MetadataOf(context);
        var declarations = metadata.OfType<IAccessDeclaration>().ToList();
        var anonymousCount = metadata.OfType<IAllowAnonymous>().Count();

        if (declarations.Count + anonymousCount != 1)
        {
            _logger.LogError(
                "El endpoint {Endpoint} tiene {Count} declaraciones de acceso y se exige exactamente 1. Se deniega el acceso.",
                context.ActionDescriptor.DisplayName,
                declarations.Count + anonymousCount);
            throw new ForbiddenProblemException("Acceso denegado.");
        }

        if (declarations is not [RequirePermissionAttribute requirement])
        {
            return;
        }

        var scope = ResolveScope(context);
        await _gate.EnsureAsync(context.HttpContext.User, requirement.Permission, scope, context.HttpContext.RequestAborted);
    }

    private static IReadOnlyList<object> MetadataOf(AuthorizationFilterContext context)
    {
        var endpoint = context.HttpContext.GetEndpoint();
        if (endpoint is not null)
        {
            return endpoint.Metadata;
        }

        return context.ActionDescriptor.EndpointMetadata?.ToList() ?? [];
    }

    private static ScopeRef ResolveScope(AuthorizationFilterContext context)
    {
        var present = AccessScopeKeys.All
            .Where(key => context.RouteData.Values.TryGetValue(key, out var value) && value is not null)
            .ToList();

        if (present.Count != 1)
        {
            throw new InvalidOperationException(
                $"La acción '{context.ActionDescriptor.DisplayName}' usa [RequirePermission] y debe tener exactamente una clave de ámbito " +
                $"({string.Join(", ", AccessScopeKeys.All)}) en su ruta; tiene {present.Count}.");
        }

        var key = present[0];
        AccessScopeKeys.TryGetKind(key, out var kind);

        var raw = Convert.ToString(context.RouteData.Values[key], CultureInfo.InvariantCulture);
        if (!long.TryParse(raw, NumberStyles.None, CultureInfo.InvariantCulture, out var id))
        {
            throw new NotFoundProblemException(AccessGate.NotFoundDetail);
        }

        return new ScopeRef(kind, id);
    }
}
