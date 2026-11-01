namespace Pps.Domain.Tests;

using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Pps.Api.Common.Access;
using Pps.Api.Controllers.Auth;
using Pps.Domain.Access;
using Xunit;

/// <summary>
/// Prueba de reflexión (ADR-16): cada acción de cada controlador tiene exactamente una declaración de acceso
/// y coincide con una fila de <c>contract/fixtures/authorization-matrix.json</c>. Es lo que impide que una acción
/// nueva quede sin protección o con un permiso distinto del contrato.
/// </summary>
public class AuthorizationMatrixTests
{
    private sealed record Row(string Method, string Path, string Minimum, string? Permission, string Scope, int? NonMember, bool ManualGate)
    {
        public string Key => $"{Method} {Path}";
    }

    private sealed record ControllerAction(Type Controller, MethodInfo Method, string Verb, string Path, IReadOnlyList<object> Declarations)
    {
        public string Key => $"{Verb} {Path}";
        public string Name => $"{Controller.Name}.{Method.Name}";
        public object Declaration => Declarations.Single();
    }

    private static readonly Regex RouteConstraint = new(@"\{(\w+):[^}]+\}", RegexOptions.Compiled);
    private static readonly Regex RouteParameter = new(@"\{(\w+)\}", RegexOptions.Compiled);

    private static readonly Lazy<JsonElement> Fixture = new(LoadFixture);
    private static readonly Lazy<IReadOnlyList<Row>> Rows = new(LoadRows);
    private static readonly Lazy<IReadOnlyList<ControllerAction>> Actions = new(DiscoverActions);

    private static JsonElement LoadFixture()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            var candidate = Path.Combine(current.FullName, "contract", "fixtures", "authorization-matrix.json");
            if (File.Exists(candidate))
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(candidate));
                return doc.RootElement.Clone();
            }

            current = current.Parent;
        }

        throw new FileNotFoundException("No se encontró el archivo authorization-matrix.json.");
    }

    private static IReadOnlyList<Row> LoadRows() =>
        Fixture.Value.GetProperty("rows").EnumerateArray()
            .Select(r => new Row(
                r.GetProperty("method").GetString()!,
                r.GetProperty("path").GetString()!,
                r.GetProperty("minimum").GetString()!,
                r.GetProperty("permission").GetString(),
                r.GetProperty("scope").GetString()!,
                r.GetProperty("nonMember").ValueKind == JsonValueKind.Null ? null : r.GetProperty("nonMember").GetInt32(),
                r.TryGetProperty("manualGate", out var manual) && manual.GetBoolean()))
            .ToList();

    private static IReadOnlyList<ControllerAction> DiscoverActions()
    {
        var controllers = typeof(AuthController).Assembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract && t.IsPublic)
            .ToList();

        var actions = new List<ControllerAction>();
        foreach (var controller in controllers)
        {
            var classAttributes = controller.GetCustomAttributes(inherit: true);
            var methods = controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
                .Where(m => !m.IsSpecialName && m.GetCustomAttribute<NonActionAttribute>() is null);

            foreach (var method in methods)
            {
                var verbs = method.GetCustomAttributes<HttpMethodAttribute>(inherit: true).ToList();
                var verb = verbs.Count == 1
                    ? verbs[0]
                    : throw new Xunit.Sdk.XunitException(
                        $"{controller.Name}.{method.Name} debe tener exactamente un atributo HTTP (tiene {verbs.Count}); " +
                        "un método público sin verbo sería una acción alcanzable por cualquier verbo.");

                var declarations = classAttributes
                    .Concat(method.GetCustomAttributes(inherit: true))
                    .Where(a => a is IAccessDeclaration || a is IAllowAnonymous)
                    .ToList();

                actions.Add(new ControllerAction(
                    controller,
                    method,
                    verb.HttpMethods.Single(),
                    FullPath(controller, verb),
                    declarations));
            }
        }

        return actions;
    }

    private static string FullPath(Type controller, HttpMethodAttribute verb)
    {
        var classTemplate = controller.GetCustomAttribute<RouteAttribute>()?.Template;
        var methodTemplate = verb.Template;

        string template;
        if (string.IsNullOrEmpty(methodTemplate))
        {
            template = classTemplate ?? string.Empty;
        }
        else if (string.IsNullOrEmpty(classTemplate) || methodTemplate.StartsWith('/') || methodTemplate.StartsWith("~/"))
        {
            template = methodTemplate.TrimStart('~');
        }
        else
        {
            template = $"{classTemplate.TrimEnd('/')}/{methodTemplate}";
        }

        return "/" + RouteConstraint.Replace(template, "{$1}").TrimStart('/');
    }

    private static string[] ScopeKeysOf(string path) =>
        RouteParameter.Matches(path)
            .Select(m => m.Groups[1].Value)
            .Where(name => AccessScopeKeys.All.Contains(name, StringComparer.OrdinalIgnoreCase))
            .ToArray();

    [Fact]
    public void Fixture_is_not_empty()
    {
        Assert.NotEmpty(Rows.Value);
        Assert.Equal(Rows.Value.Count, Rows.Value.Select(r => r.Key).Distinct().Count());
    }

    [Fact]
    public void Every_action_has_exactly_one_access_declaration()
    {
        var offenders = Actions.Value
            .Where(a => a.Declarations.Count != 1)
            .Select(a => $"{a.Name} ({a.Declarations.Count})")
            .ToList();

        Assert.True(offenders.Count == 0, "Acciones sin exactamente una declaración de acceso: " + string.Join(", ", offenders));
    }

    [Fact]
    public void No_controller_uses_a_plain_Authorize_attribute()
    {
        // [Authorize] a secas no es una declaración: el filtro contaría cero y fallaría cerrado.
        var plain = typeof(AuthController).Assembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t))
            .SelectMany(t => t.GetCustomAttributes(inherit: true)
                .Concat(t.GetMethods().SelectMany(m => m.GetCustomAttributes(inherit: true)))
                .Where(a => a is AuthorizeAttribute && a is not IAccessDeclaration)
                .Select(a => $"{t.Name}: {a.GetType().Name}"))
            .ToList();

        Assert.True(plain.Count == 0, "Usos de [Authorize] sin marcador de acceso: " + string.Join(", ", plain));
    }

    [Fact]
    public void Every_action_matches_exactly_one_fixture_row_and_every_row_matches_one_action()
    {
        var actionKeys = Actions.Value.Select(a => a.Key).ToList();
        var rowKeys = Rows.Value.Select(r => r.Key).ToList();

        Assert.Equal(actionKeys.Count, actionKeys.Distinct().Count());
        Assert.Empty(actionKeys.Except(rowKeys));
        Assert.Empty(rowKeys.Except(actionKeys));
    }

    [Fact]
    public void Declared_access_matches_the_fixture_row()
    {
        foreach (var action in Actions.Value)
        {
            var row = Rows.Value.Single(r => r.Key == action.Key);
            var declaration = action.Declaration;

            switch (row.Minimum)
            {
                case "anonymous":
                    Assert.True(declaration is IAllowAnonymous, $"{action.Name} debe ser [AllowAnonymous] (fila {row.Key}).");
                    break;

                case "any-authenticated":
                    Assert.True(declaration is AuthenticatedOnlyAttribute, $"{action.Name} debe ser [AuthenticatedOnly] (fila {row.Key}).");
                    break;

                case "global-admin":
                    Assert.True(declaration is RequireGlobalAdminAttribute, $"{action.Name} debe ser [RequireGlobalAdmin] (fila {row.Key}).");
                    break;

                default:
                    if (row.ManualGate)
                    {
                        // Listar proyectos y tile-access aplican su permiso a mano: la prueba de humo los cubre.
                        Assert.True(declaration is AuthenticatedOnlyAttribute, $"{action.Name} debe ser [AuthenticatedOnly] (fila {row.Key}, manualGate).");
                    }
                    else
                    {
                        var permission = Assert.IsType<RequirePermissionAttribute>(declaration);
                        Assert.Equal(row.Permission, PermissionMatrix.ToWire(permission.Permission));
                        Assert.Equal(row.Minimum, ProjectRoles.ToWire(PermissionMatrix.MinimumRole(permission.Permission)));
                    }

                    break;
            }
        }
    }

    [Fact]
    public void Non_member_response_follows_the_declaration()
    {
        foreach (var action in Actions.Value)
        {
            var row = Rows.Value.Single(r => r.Key == action.Key);

            if (row.Scope == "none")
            {
                Assert.Null(row.NonMember);
            }
            else if (action.Declaration is RequirePermissionAttribute)
            {
                // El filtro oculta el recurso a quien no es miembro.
                Assert.Equal(404, row.NonMember);
            }
            else if (action.Declaration is RequireGlobalAdminAttribute)
            {
                // El framework deniega antes de mirar el recurso.
                Assert.Equal(403, row.NonMember);
            }
        }
    }

    [Fact]
    public void RequirePermission_actions_have_exactly_one_scope_key_matching_the_row_scope()
    {
        var permissionActions = Actions.Value.Where(a => a.Declaration is RequirePermissionAttribute).ToList();
        Assert.NotEmpty(permissionActions);

        foreach (var action in permissionActions)
        {
            var keys = ScopeKeysOf(action.Path);
            Assert.True(keys.Length == 1, $"{action.Name} ({action.Path}) debe tener exactamente una clave de ámbito; tiene {keys.Length}.");

            AccessScopeKeys.TryGetKind(keys[0], out var kind);
            var row = Rows.Value.Single(r => r.Key == action.Key);
            Assert.Equal(row.Scope, kind.ToString().ToLowerInvariant());
        }
    }

    [Fact]
    public void AuthenticatedOnly_set_is_exactly_logout_me_list_projects_and_tile_access()
    {
        var authenticatedOnly = Actions.Value
            .Where(a => a.Declaration is AuthenticatedOnlyAttribute)
            .Select(a => a.Key)
            .Order()
            .ToList();

        var expected = new[]
        {
            "POST /api/v1/auth/logout",
            "GET /api/v1/auth/me",
            "GET /api/v1/projects",
            "GET /internal/v1/tile-access"
        }.Order().ToList();

        Assert.Equal(expected, authenticatedOnly);
    }

    [Fact]
    public void Class_level_RequireGlobalAdmin_exists_only_on_users_and_imports()
    {
        var classLevel = typeof(AuthController).Assembly.GetTypes()
            .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && t.GetCustomAttribute<RequireGlobalAdminAttribute>() is not null)
            .Select(t => t.Name)
            .Order()
            .ToList();

        Assert.Equal(new[] { "ImportsController", "UsersController" }, classLevel);
    }

    [Fact]
    public void Permission_matrix_matches_the_fixture_permissions()
    {
        var fixturePermissions = Fixture.Value.GetProperty("permissions").EnumerateObject()
            .ToDictionary(p => p.Name, p => p.Value.GetString()!);

        var declared = Enum.GetValues<Permission>()
            .ToDictionary(p => PermissionMatrix.ToWire(p), p => ProjectRoles.ToWire(PermissionMatrix.MinimumRole(p)));

        Assert.Equal(
            fixturePermissions.OrderBy(kv => kv.Key).Select(kv => $"{kv.Key}={kv.Value}").ToList(),
            declared.OrderBy(kv => kv.Key).Select(kv => $"{kv.Key}={kv.Value}").ToList());

        var projectRoles = Fixture.Value.GetProperty("roles").GetProperty("project").EnumerateArray().Select(e => e.GetString()!).ToList();
        Assert.Equal(projectRoles, ProjectRoles.All.ToList());

        var globalRoles = Fixture.Value.GetProperty("roles").GetProperty("global").EnumerateArray().Select(e => e.GetString()!).ToList();
        Assert.Equal(globalRoles, GlobalRoles.All.ToList());
    }
}
