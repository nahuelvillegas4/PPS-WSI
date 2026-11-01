namespace Pps.Domain.Tests;

using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging.Abstractions;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Catalog;
using Pps.Api.Controllers.Catalog.Dtos;
using Pps.Domain.Access;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Infrastructure.Persistence;
using Xunit;

/// <summary>Listado de proyectos filtrado por membresía y <c>myRole</c> en las respuestas de proyecto.</summary>
public class ProjectsAccessControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly ProjectsController _controller;

    private readonly User _admin = new() { Username = "admin", PasswordHash = "hash", Role = GlobalRoles.Admin };
    private readonly User _alice = new() { Username = "alice", PasswordHash = "hash", Role = GlobalRoles.User };
    private readonly User _bob = new() { Username = "bob", PasswordHash = "hash", Role = GlobalRoles.User };
    private readonly User _carol = new() { Username = "carol", PasswordHash = "hash", Role = GlobalRoles.User };

    private readonly Project _p1 = new() { Name = "Proyecto 1", Description = "Primero" };
    private readonly Project _p2 = new() { Name = "Proyecto 2" };
    private readonly Project _p3 = new() { Name = "Proyecto 3" };

    public ProjectsAccessControllerTests()
    {
        _connection = AccessTestSupport.OpenConnection();
        _db = AccessTestSupport.CreateDb(_connection);

        _db.Users.AddRange(_admin, _alice, _bob, _carol);
        _db.Projects.AddRange(_p1, _p2, _p3);
        _db.SaveChanges();

        // alice: administradora del proyecto 1 y lectora del 2. bob: anotador del 2. carol: sin proyectos.
        _db.ProjectMembers.AddRange(
            new ProjectMember { ProjectId = _p1.Id, UserId = _alice.Id, Role = ProjectRole.ProjectAdmin },
            new ProjectMember { ProjectId = _p2.Id, UserId = _alice.Id, Role = ProjectRole.Viewer },
            new ProjectMember { ProjectId = _p2.Id, UserId = _bob.Id, Role = ProjectRole.Annotator });
        _db.SaveChanges();
        _db.ChangeTracker.Clear();

        _controller = new ProjectsController(_db, NullLogger<ProjectsController>.Instance);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private void Login(User user) =>
        AccessTestSupport.SetUser(_controller, user.Id, user.Username, user.Role);

    private static ProjectListResponse List(ActionResult<ProjectListResponse> result) =>
        Assert.IsType<ProjectListResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);

    // ---- GET /projects ----

    [Fact]
    public async Task ListProjects_global_admin_sees_every_project_as_project_admin()
    {
        Login(_admin);

        var items = List(await _controller.ListProjects()).Items;

        Assert.Equal(new[] { "Proyecto 1", "Proyecto 2", "Proyecto 3" }, items.Select(p => p.Name));
        Assert.All(items, p => Assert.Equal("project-admin", p.MyRole));
        Assert.Equal("Primero", items[0].Description);
    }

    [Fact]
    public async Task ListProjects_a_member_sees_only_their_projects_with_their_role()
    {
        Login(_alice);

        var items = List(await _controller.ListProjects()).Items;

        Assert.Equal(new[] { (_p1.Id, "project-admin"), (_p2.Id, "viewer") }, items.Select(p => (p.Id, p.MyRole)));
        Assert.DoesNotContain(items, p => p.Id == _p3.Id);
    }

    [Fact]
    public async Task ListProjects_each_user_gets_their_own_role_for_the_same_project()
    {
        Login(_bob);

        var items = List(await _controller.ListProjects()).Items;

        var only = Assert.Single(items);
        Assert.Equal((_p2.Id, "annotator"), (only.Id, only.MyRole));
    }

    [Fact]
    public async Task ListProjects_a_user_without_memberships_gets_an_empty_list()
    {
        Login(_carol);

        Assert.Empty(List(await _controller.ListProjects()).Items);
    }

    [Fact]
    public async Task ListProjects_without_a_user_id_claim_is_unauthenticated()
    {
        var withoutId = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "ghost") }, "Cookie"));
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = withoutId } };

        await Assert.ThrowsAsync<UnauthenticatedProblemException>(() => _controller.ListProjects());
    }

    [Fact]
    public async Task ListProjects_removing_a_membership_hides_the_project()
    {
        Login(_alice);
        _db.ProjectMembers.Remove(_db.ProjectMembers.Single(m => m.ProjectId == _p2.Id && m.UserId == _alice.Id));
        await _db.SaveChangesAsync();

        var items = List(await _controller.ListProjects()).Items;

        Assert.Equal(new[] { _p1.Id }, items.Select(p => p.Id));
    }

    // ---- GET /projects/{id} ----

    [Theory]
    [InlineData("alice", 1, "project-admin")]
    [InlineData("alice", 2, "viewer")]
    [InlineData("bob", 2, "annotator")]
    [InlineData("admin", 1, "project-admin")]
    [InlineData("admin", 3, "project-admin")]
    public async Task GetProject_includes_my_role(string username, int projectNumber, string expectedRole)
    {
        Login(new[] { _admin, _alice, _bob }.Single(u => u.Username == username));
        var project = new[] { _p1, _p2, _p3 }[projectNumber - 1];

        var result = await _controller.GetProject(project.Id);

        var body = Assert.IsType<ProjectResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal((project.Id, project.Name, expectedRole), (body.Id, body.Name, body.MyRole));
    }

    [Fact]
    public async Task GetProject_of_a_project_the_user_is_not_a_member_of_responds_404_when_the_filter_is_bypassed()
    {
        Login(_bob);

        var ex = await Assert.ThrowsAsync<NotFoundProblemException>(() => _controller.GetProject(_p1.Id));

        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public async Task GetProject_missing_project_responds_404()
    {
        Login(_admin);

        await Assert.ThrowsAsync<NotFoundProblemException>(() => _controller.GetProject(9_999));
    }

    // ---- POST / PATCH ----

    [Fact]
    public async Task CreateProject_responds_with_my_role_project_admin()
    {
        Login(_admin);

        var result = await _controller.CreateProject(new ProjectInput { Name = "Nuevo", Description = "Desc" });

        var created = Assert.IsType<CreatedResult>(result.Result);
        var body = Assert.IsType<ProjectResponse>(created.Value);
        Assert.Equal(("Nuevo", "Desc", "project-admin"), (body.Name, body.Description, body.MyRole));
        Assert.Equal($"/api/v1/projects/{body.Id}", created.Location);
    }

    [Fact]
    public async Task CreateProject_does_not_create_memberships()
    {
        Login(_admin);
        var before = _db.ProjectMembers.Count();

        await _controller.CreateProject(new ProjectInput { Name = "Nuevo" });

        Assert.Equal(before, _db.ProjectMembers.Count());
    }

    [Fact]
    public async Task UpdateProject_responds_with_my_role_project_admin()
    {
        Login(_admin);

        var result = await _controller.UpdateProject(_p2.Id, new ProjectPatch { Description = "Cambiada" });

        var body = Assert.IsType<ProjectResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal(("Cambiada", "project-admin"), (body.Description, body.MyRole));
    }

    // ---- Contrato de cable ----

    [Fact]
    public void ProjectResponse_serializes_my_role_in_camel_case()
    {
        var json = JsonSerializer.Serialize(
            new ProjectResponse { Id = 1, Name = "P", MyRole = "viewer" },
            new JsonSerializerOptions(JsonSerializerDefaults.Web));

        using var doc = JsonDocument.Parse(json);
        Assert.Equal("viewer", doc.RootElement.GetProperty("myRole").GetString());
    }

    [Fact]
    public void Project_input_bodies_do_not_accept_my_role()
    {
        var strict = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
        };

        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<ProjectInput>("{\"name\":\"P\",\"myRole\":\"project-admin\"}", strict));
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<ProjectPatch>("{\"myRole\":\"project-admin\"}", strict));
    }
}
