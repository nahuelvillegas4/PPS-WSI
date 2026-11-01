namespace Pps.Domain.Tests;

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Pps.Api.Common.Access;
using Pps.Api.Common.Errors;
using Pps.Domain.Access;
using Pps.Infrastructure.Persistence;
using Xunit;

public class AccessGuardFilterTests
{
    private const long UserId = 42;

    private sealed class FakeReader : IProjectAccessReader
    {
        public ScopeFacts? Facts { get; set; }
        public List<(long UserId, ScopeRef Scope)> Calls { get; } = new();

        public Task<ScopeFacts?> FindScopeAsync(long userId, ScopeRef scope, CancellationToken ct)
        {
            Calls.Add((userId, scope));
            return Task.FromResult(Facts);
        }

        public Task<TileAccessFacts?> FindImageForTileAsync(long userId, long imageId, CancellationToken ct) =>
            throw new NotSupportedException("El filtro no usa tile-access.");
    }

    private sealed class CapturingLogger : ILogger<AccessGuardFilter>
    {
        public List<LogLevel> Levels { get; } = new();

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Levels.Add(logLevel);
    }

    private static (AccessGuardFilter Filter, FakeReader Reader) CreateFilter(ILogger<AccessGuardFilter>? logger = null)
    {
        var reader = new FakeReader();
        return (new AccessGuardFilter(new AccessGate(reader), logger ?? NullLogger<AccessGuardFilter>.Instance), reader);
    }

    private static AuthorizationFilterContext BuildContext(
        IEnumerable<object> metadata,
        IDictionary<string, object?> routeValues,
        ClaimsPrincipal? user = null,
        Endpoint? endpoint = null)
    {
        var httpContext = new DefaultHttpContext { User = user ?? AccessTestSupport.Principal(UserId, "alice", GlobalRoles.User) };
        if (endpoint is not null)
        {
            httpContext.SetEndpoint(endpoint);
        }

        var routeData = new RouteData();
        foreach (var (key, value) in routeValues)
        {
            routeData.Values[key] = value;
        }

        var descriptor = new ActionDescriptor { DisplayName = "Test.Action", EndpointMetadata = metadata.ToList() };
        return new AuthorizationFilterContext(new ActionContext(httpContext, routeData, descriptor), new List<IFilterMetadata>());
    }

    private static Dictionary<string, object?> Route(string key, object? value) => new() { [key] = value };

    private static object Require(Permission permission) => new RequirePermissionAttribute(permission);

    [Fact]
    public async Task Allowed_when_the_member_role_reaches_the_permission_minimum()
    {
        var (filter, reader) = CreateFilter();
        reader.Facts = new ScopeFacts(7, ProjectRole.Annotator);
        var context = BuildContext([Require(Permission.AnnotationWrite)], Route("datasetId", "3"));

        await filter.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
        var call = Assert.Single(reader.Calls);
        Assert.Equal((UserId, new ScopeRef(ScopeKind.Dataset, 3)), call);
    }

    [Fact]
    public async Task Missing_resource_responds_404()
    {
        var (filter, reader) = CreateFilter();
        reader.Facts = null;
        var context = BuildContext([Require(Permission.ProjectView)], Route("imageId", "9"));

        var ex = await Assert.ThrowsAsync<NotFoundProblemException>(() => filter.OnAuthorizationAsync(context));

        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public async Task Non_member_gets_the_same_404_as_a_missing_resource()
    {
        var (filter, reader) = CreateFilter();

        reader.Facts = null;
        var missing = await Assert.ThrowsAsync<NotFoundProblemException>(
            () => filter.OnAuthorizationAsync(BuildContext([Require(Permission.ProjectView)], Route("projectId", "5"))));

        reader.Facts = new ScopeFacts(5, null);
        var notMember = await Assert.ThrowsAsync<NotFoundProblemException>(
            () => filter.OnAuthorizationAsync(BuildContext([Require(Permission.ProjectView)], Route("projectId", "5"))));

        Assert.Equal(missing.Detail, notMember.Detail);
        Assert.Equal(missing.ProblemType, notMember.ProblemType);
        Assert.Equal(AccessGate.NotFoundDetail, notMember.Detail);
    }

    [Theory]
    [InlineData(ProjectRole.Viewer, Permission.AnnotationWrite)]
    [InlineData(ProjectRole.Viewer, Permission.ImageUpload)]
    [InlineData(ProjectRole.Annotator, Permission.CatalogManage)]
    [InlineData(ProjectRole.Annotator, Permission.MemberManage)]
    [InlineData(ProjectRole.Annotator, Permission.DatasetExport)]
    public async Task Member_with_an_insufficient_role_responds_403(ProjectRole role, Permission permission)
    {
        var (filter, reader) = CreateFilter();
        reader.Facts = new ScopeFacts(1, role);

        var ex = await Assert.ThrowsAsync<ForbiddenProblemException>(
            () => filter.OnAuthorizationAsync(BuildContext([Require(permission)], Route("projectId", "1"))));

        Assert.Equal(403, ex.StatusCode);
    }

    [Theory]
    [InlineData(ProjectRole.Viewer, Permission.ProjectView)]
    [InlineData(ProjectRole.Annotator, Permission.AnnotationWrite)]
    [InlineData(ProjectRole.ProjectAdmin, Permission.CatalogManage)]
    [InlineData(ProjectRole.ProjectAdmin, Permission.ImageUpload)]
    [InlineData(ProjectRole.ProjectAdmin, Permission.MemberManage)]
    [InlineData(ProjectRole.ProjectAdmin, Permission.DatasetExport)]
    public async Task Member_with_a_sufficient_role_is_allowed(ProjectRole role, Permission permission)
    {
        var (filter, reader) = CreateFilter();
        reader.Facts = new ScopeFacts(1, role);
        var context = BuildContext([Require(permission)], Route("projectId", "1"));

        await filter.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
    }

    [Fact]
    public async Task Global_admin_is_allowed_without_membership_but_still_gets_404_for_a_missing_resource()
    {
        var admin = AccessTestSupport.Principal(1, "admin", GlobalRoles.Admin);
        var (filter, reader) = CreateFilter();

        reader.Facts = new ScopeFacts(5, null);
        var allowed = BuildContext([Require(Permission.MemberManage)], Route("projectId", "5"), admin);
        await filter.OnAuthorizationAsync(allowed);
        Assert.Null(allowed.Result);

        reader.Facts = null;
        await Assert.ThrowsAsync<NotFoundProblemException>(
            () => filter.OnAuthorizationAsync(BuildContext([Require(Permission.MemberManage)], Route("projectId", "5"), admin)));
    }

    [Theory]
    [InlineData("projectId", ScopeKind.Project)]
    [InlineData("datasetId", ScopeKind.Dataset)]
    [InlineData("classId", ScopeKind.Class)]
    [InlineData("imageId", ScopeKind.Image)]
    [InlineData("annotationId", ScopeKind.Annotation)]
    public async Task Each_route_key_resolves_to_its_scope_kind(string key, ScopeKind expected)
    {
        var (filter, reader) = CreateFilter();
        reader.Facts = new ScopeFacts(1, ProjectRole.ProjectAdmin);

        await filter.OnAuthorizationAsync(BuildContext([Require(Permission.ProjectView)], Route(key, "11")));

        Assert.Equal(new ScopeRef(expected, 11), Assert.Single(reader.Calls).Scope);
    }

    [Fact]
    public async Task Route_value_that_is_not_a_number_responds_404_without_querying()
    {
        var (filter, reader) = CreateFilter();

        await Assert.ThrowsAsync<NotFoundProblemException>(
            () => filter.OnAuthorizationAsync(BuildContext([Require(Permission.ProjectView)], Route("projectId", "abc"))));

        Assert.Empty(reader.Calls);
    }

    [Fact]
    public async Task Zero_declarations_fail_closed_with_403_and_log_an_error()
    {
        var logger = new CapturingLogger();
        var (filter, reader) = CreateFilter(logger);

        var ex = await Assert.ThrowsAsync<ForbiddenProblemException>(
            () => filter.OnAuthorizationAsync(BuildContext([new AuthorizeAttribute()], Route("projectId", "1"))));

        Assert.Equal(403, ex.StatusCode);
        Assert.Contains(LogLevel.Error, logger.Levels);
        Assert.Empty(reader.Calls);
    }

    [Fact]
    public async Task Two_declarations_fail_closed_with_403_and_log_an_error()
    {
        var logger = new CapturingLogger();
        var (filter, reader) = CreateFilter(logger);

        await Assert.ThrowsAsync<ForbiddenProblemException>(() => filter.OnAuthorizationAsync(
            BuildContext([Require(Permission.ProjectView), new RequireGlobalAdminAttribute()], Route("projectId", "1"))));
        await Assert.ThrowsAsync<ForbiddenProblemException>(() => filter.OnAuthorizationAsync(
            BuildContext([Require(Permission.ProjectView), new AllowAnonymousAttribute()], Route("projectId", "1"))));
        await Assert.ThrowsAsync<ForbiddenProblemException>(() => filter.OnAuthorizationAsync(
            BuildContext([new AuthenticatedOnlyAttribute(), new RequireGlobalAdminAttribute()], new Dictionary<string, object?>())));

        Assert.Equal(3, logger.Levels.Count(l => l == LogLevel.Error));
        Assert.Empty(reader.Calls);
    }

    [Fact]
    public async Task Missing_scope_key_is_a_programming_error()
    {
        var (filter, reader) = CreateFilter();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(
            () => filter.OnAuthorizationAsync(BuildContext([Require(Permission.ProjectView)], Route("userId", "3"))));

        Assert.Contains("clave de ámbito", ex.Message);
        Assert.Empty(reader.Calls);
    }

    [Fact]
    public async Task Two_scope_keys_are_a_programming_error()
    {
        var (filter, reader) = CreateFilter();
        var routeValues = new Dictionary<string, object?> { ["projectId"] = "1", ["datasetId"] = "2" };

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => filter.OnAuthorizationAsync(BuildContext([Require(Permission.ProjectView)], routeValues)));

        Assert.Empty(reader.Calls);
    }

    [Fact]
    public async Task Session_without_a_user_id_claim_is_unauthenticated()
    {
        var (filter, reader) = CreateFilter();
        var anonymousLike = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "ghost") }, "Cookie"));

        var ex = await Assert.ThrowsAsync<UnauthenticatedProblemException>(
            () => filter.OnAuthorizationAsync(BuildContext([Require(Permission.ProjectView)], Route("projectId", "1"), anonymousLike)));

        Assert.Equal(401, ex.StatusCode);
        Assert.Empty(reader.Calls);
    }

    [Theory]
    [MemberData(nameof(FrameworkDecidedDeclarations))]
    public async Task Framework_decided_declarations_finish_without_querying_the_reader(object declaration)
    {
        var (filter, reader) = CreateFilter();
        var context = BuildContext([declaration], new Dictionary<string, object?>());

        await filter.OnAuthorizationAsync(context);

        Assert.Null(context.Result);
        Assert.Empty(reader.Calls);
    }

    public static IEnumerable<object[]> FrameworkDecidedDeclarations() =>
    [
        [new RequireGlobalAdminAttribute()],
        [new AuthenticatedOnlyAttribute()],
        [new AllowAnonymousAttribute()]
    ];

    [Fact]
    public async Task Endpoint_metadata_takes_precedence_over_the_action_descriptor()
    {
        var (filter, reader) = CreateFilter();
        reader.Facts = new ScopeFacts(1, ProjectRole.Viewer);
        var endpoint = new Endpoint(null, new EndpointMetadataCollection(Require(Permission.ProjectView)), "test");
        // El descriptor traería una declaración distinta: solo cuenta la del endpoint.
        var context = BuildContext([new RequireGlobalAdminAttribute()], Route("projectId", "1"), endpoint: endpoint);

        await filter.OnAuthorizationAsync(context);

        Assert.Single(reader.Calls);
    }

    [Fact]
    public void Filter_runs_before_any_other_authorization_filter()
    {
        var (filter, _) = CreateFilter();

        Assert.Equal(-1000, AccessGuardFilter.FilterOrder);
        Assert.Equal(-1000, filter.Order);
    }

    [Fact]
    public void AddAccessControl_registers_the_global_filter_the_gate_and_the_fallback_policy()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<AppDbContext>(options => options.UseSqlite("DataSource=:memory:"));
        services.AddAccessControl();
        using var provider = services.BuildServiceProvider();

        var mvc = provider.GetRequiredService<IOptions<MvcOptions>>().Value;
        var registered = Assert.Single(mvc.Filters.OfType<TypeFilterAttribute>(), f => f.ImplementationType == typeof(AccessGuardFilter));
        Assert.Equal(-1000, registered.Order);

        var authorization = provider.GetRequiredService<IOptions<AuthorizationOptions>>().Value;
        Assert.NotNull(authorization.FallbackPolicy);
        Assert.Contains(authorization.FallbackPolicy!.Requirements, r => r is DenyAnonymousAuthorizationRequirement);

        using var scope = provider.CreateScope();
        Assert.IsType<AccessGate>(scope.ServiceProvider.GetRequiredService<IAccessGate>());
        Assert.NotNull(scope.ServiceProvider.GetService<IProjectAccessReader>());
    }

    [Fact]
    public void Markers_forbid_multiple_use_and_global_admin_requires_the_admin_role()
    {
        foreach (var type in new[] { typeof(RequirePermissionAttribute), typeof(RequireGlobalAdminAttribute), typeof(AuthenticatedOnlyAttribute) })
        {
            var usage = (AttributeUsageAttribute)Attribute.GetCustomAttribute(type, typeof(AttributeUsageAttribute))!;
            Assert.False(usage.AllowMultiple, type.Name);
            Assert.True(typeof(IAccessDeclaration).IsAssignableFrom(type), type.Name);
        }

        Assert.Equal(GlobalRoles.Admin, new RequireGlobalAdminAttribute().Roles);
        Assert.Null(new AuthenticatedOnlyAttribute().Roles);
        Assert.False(typeof(IAuthorizeData).IsAssignableFrom(typeof(RequirePermissionAttribute)));
    }
}
