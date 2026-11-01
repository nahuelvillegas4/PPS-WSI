namespace Pps.Domain.Tests;

using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Members;
using Pps.Api.Controllers.Members.Dtos;
using Pps.Domain.Access;
using Pps.Domain.Annotations;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Infrastructure.Persistence;
using Xunit;

public class ProjectMembersControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly ProjectMembersController _controller;

    private readonly User _admin = new() { Username = "admin", PasswordHash = "hash", Role = GlobalRoles.Admin };
    private readonly User _boss = new() { Username = "boss", PasswordHash = "hash", Role = GlobalRoles.User };
    private readonly User _alice = new() { Username = "alice", PasswordHash = "hash", Role = GlobalRoles.User };
    private readonly User _bob = new() { Username = "bob", PasswordHash = "hash", Role = GlobalRoles.User };
    private readonly User _inactive = new() { Username = "carol", PasswordHash = "hash", Role = GlobalRoles.User, IsActive = false };
    private readonly User _system = new() { Username = "import-cric", PasswordHash = "hash", Role = GlobalRoles.User, IsSystem = true };
    private readonly User _otherAdmin = new() { Username = "root2", PasswordHash = "hash", Role = GlobalRoles.Admin };
    private readonly Project _p1 = new() { Name = "Proyecto 1" };
    private readonly Project _p2 = new() { Name = "Proyecto 2" };

    public ProjectMembersControllerTests()
    {
        _connection = AccessTestSupport.OpenConnection();
        _db = AccessTestSupport.CreateDb(_connection);
        Seed();
        _controller = NewController(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private void Seed()
    {
        _db.Users.AddRange(_admin, _boss, _alice, _bob, _inactive, _system, _otherAdmin);
        _db.Projects.AddRange(_p1, _p2);
        _db.SaveChanges();

        // boss es administrador del proyecto 1; bob ya es anotador en el proyecto 1 y viewer en el 2.
        _db.ProjectMembers.AddRange(
            new ProjectMember { ProjectId = _p1.Id, UserId = _boss.Id, Role = ProjectRole.ProjectAdmin },
            new ProjectMember { ProjectId = _p1.Id, UserId = _bob.Id, Role = ProjectRole.Annotator },
            new ProjectMember { ProjectId = _p2.Id, UserId = _bob.Id, Role = ProjectRole.Viewer });
        _db.SaveChanges();
        _db.ChangeTracker.Clear();
    }

    private ProjectMembersController NewController(AppDbContext db)
    {
        var controller = new ProjectMembersController(db, NullLogger<ProjectMembersController>.Instance);
        AccessTestSupport.SetUser(controller, _boss.Id, _boss.Username, GlobalRoles.User);
        return controller;
    }

    private static T Body<T>(ActionResult<T> result) where T : class =>
        (T)((ObjectResult)result.Result!).Value!;

    // ---- POST ----

    [Fact]
    public async Task AddMember_creates_the_membership_and_returns_201_with_the_contract_fields()
    {
        var before = DateTime.UtcNow.AddSeconds(-1);

        var result = await _controller.AddMember(
            _p1.Id,
            new AddProjectMemberRequest { Username = "alice", Role = "viewer" },
            CancellationToken.None);

        var created = Assert.IsType<CreatedResult>(result.Result);
        Assert.Equal($"/api/v1/projects/{_p1.Id}/members/{_alice.Id}", created.Location);
        var body = Assert.IsType<ProjectMemberResponse>(created.Value);
        Assert.Equal(_alice.Id, body.UserId);
        Assert.Equal("alice", body.Username);
        Assert.Equal("viewer", body.Role);
        Assert.True(body.IsActive);
        Assert.True(body.CreatedAt >= before);

        var stored = await _db.ProjectMembers.AsNoTracking().SingleAsync(m => m.ProjectId == _p1.Id && m.UserId == _alice.Id);
        Assert.Equal(ProjectRole.Viewer, stored.Role);
        Assert.Equal(_boss.Id, stored.GrantedByUserId);
        Assert.True(stored.CreatedAt >= before);
        Assert.Equal(stored.CreatedAt, stored.UpdatedAt);
    }

    [Theory]
    [InlineData("viewer", ProjectRole.Viewer)]
    [InlineData("annotator", ProjectRole.Annotator)]
    [InlineData("project-admin", ProjectRole.ProjectAdmin)]
    public async Task AddMember_stores_each_project_role(string wire, ProjectRole expected)
    {
        await _controller.AddMember(_p1.Id, new AddProjectMemberRequest { Username = "alice", Role = wire }, CancellationToken.None);

        var stored = await _db.ProjectMembers.AsNoTracking().SingleAsync(m => m.ProjectId == _p1.Id && m.UserId == _alice.Id);
        Assert.Equal(expected, stored.Role);
    }

    [Fact]
    public async Task AddMember_in_one_project_does_not_touch_other_projects()
    {
        await _controller.AddMember(_p2.Id, new AddProjectMemberRequest { Username = "alice", Role = "annotator" }, CancellationToken.None);

        Assert.False(await _db.ProjectMembers.AnyAsync(m => m.ProjectId == _p1.Id && m.UserId == _alice.Id));
        Assert.True(await _db.ProjectMembers.AnyAsync(m => m.ProjectId == _p2.Id && m.UserId == _alice.Id));
    }

    [Fact]
    public async Task AddMember_unknown_user_responds_404_user_not_found()
    {
        var ex = await Assert.ThrowsAsync<NotFoundProblemException>(() => _controller.AddMember(
            _p1.Id, new AddProjectMemberRequest { Username = "nobody", Role = "viewer" }, CancellationToken.None));

        Assert.Equal(404, ex.StatusCode);
        Assert.Equal(GiaProblemTypes.UserNotFound, ex.ProblemType);
    }

    [Fact]
    public async Task AddMember_gives_the_same_answer_for_unknown_inactive_system_and_admin_users()
    {
        var answers = new List<(int Status, string Type, string? Detail)>();
        foreach (var username in new[] { "nobody", "carol", "import-cric", "root2", "admin" })
        {
            var ex = await Assert.ThrowsAsync<NotFoundProblemException>(() => _controller.AddMember(
                _p1.Id, new AddProjectMemberRequest { Username = username, Role = "viewer" }, CancellationToken.None));
            answers.Add((ex.StatusCode, ex.ProblemType, ex.Detail));
        }

        Assert.Single(answers.Distinct());
        Assert.Equal((404, GiaProblemTypes.UserNotFound), (answers[0].Status, answers[0].Type));
        Assert.Empty(await _db.ProjectMembers.Where(m => m.UserId == _inactive.Id || m.UserId == _system.Id || m.UserId == _otherAdmin.Id).ToListAsync());
    }

    [Fact]
    public async Task AddMember_duplicate_responds_409_already_member_and_keeps_the_current_role()
    {
        var ex = await Assert.ThrowsAsync<ConflictProblemException>(() => _controller.AddMember(
            _p1.Id, new AddProjectMemberRequest { Username = "bob", Role = "project-admin" }, CancellationToken.None));

        Assert.Equal(409, ex.StatusCode);
        Assert.Equal(GiaProblemTypes.AlreadyMember, ex.ProblemType);

        var stored = await _db.ProjectMembers.AsNoTracking().SingleAsync(m => m.ProjectId == _p1.Id && m.UserId == _bob.Id);
        Assert.Equal(ProjectRole.Annotator, stored.Role);
    }

    [Fact]
    public async Task AddMember_concurrent_duplicate_is_reported_as_409_already_member()
    {
        // Simula la carrera: otra petición inserta la misma membresía justo antes de que esta confirme.
        await using var racing = new HookedDbContext(AccessTestSupport.Options(_connection))
        {
            BeforeSave = async () =>
            {
                await using var rival = AccessTestSupport.CreateDb(_connection);
                rival.ProjectMembers.Add(new ProjectMember { ProjectId = _p1.Id, UserId = _alice.Id, Role = ProjectRole.Viewer });
                await rival.SaveChangesAsync();
            }
        };
        var controller = NewController(racing);

        var ex = await Assert.ThrowsAsync<ConflictProblemException>(() => controller.AddMember(
            _p1.Id, new AddProjectMemberRequest { Username = "alice", Role = "annotator" }, CancellationToken.None));

        Assert.Equal(GiaProblemTypes.AlreadyMember, ex.ProblemType);
        var stored = await _db.ProjectMembers.AsNoTracking().SingleAsync(m => m.ProjectId == _p1.Id && m.UserId == _alice.Id);
        Assert.Equal(ProjectRole.Viewer, stored.Role);
    }

    [Fact]
    public async Task AddMember_rethrows_a_database_error_that_is_not_a_duplicate()
    {
        await using var failing = new HookedDbContext(AccessTestSupport.Options(_connection))
        {
            BeforeSave = () => Task.FromException(new DbUpdateException("fallo simulado"))
        };
        var controller = NewController(failing);

        await Assert.ThrowsAsync<DbUpdateException>(() => controller.AddMember(
            _p1.Id, new AddProjectMemberRequest { Username = "alice", Role = "viewer" }, CancellationToken.None));

        Assert.False(await _db.ProjectMembers.AnyAsync(m => m.ProjectId == _p1.Id && m.UserId == _alice.Id));
    }

    [Fact]
    public async Task AddMember_missing_project_responds_404()
    {
        var ex = await Assert.ThrowsAsync<NotFoundProblemException>(() => _controller.AddMember(
            9_999, new AddProjectMemberRequest { Username = "alice", Role = "viewer" }, CancellationToken.None));

        Assert.Equal(GiaProblemTypes.NotFound, ex.ProblemType);
    }

    [Fact]
    public async Task AddMember_rejects_a_role_outside_the_ladder_when_called_without_model_validation()
    {
        await Assert.ThrowsAsync<ValidationProblemException>(() => _controller.AddMember(
            _p1.Id, new AddProjectMemberRequest { Username = "alice", Role = "owner" }, CancellationToken.None));

        Assert.False(await _db.ProjectMembers.AnyAsync(m => m.ProjectId == _p1.Id && m.UserId == _alice.Id));
    }

    // ---- GET ----

    [Fact]
    public async Task ListMembers_returns_only_the_members_of_the_project_ordered_by_username()
    {
        _db.ProjectMembers.Add(new ProjectMember { ProjectId = _p1.Id, UserId = _alice.Id, Role = ProjectRole.Viewer });
        _db.ProjectMembers.Add(new ProjectMember { ProjectId = _p1.Id, UserId = _inactive.Id, Role = ProjectRole.Viewer });
        await _db.SaveChangesAsync();

        var result = await _controller.ListMembers(_p1.Id, CancellationToken.None);

        var items = Body(result).Items;
        Assert.Equal(new[] { "alice", "bob", "boss", "carol" }, items.Select(i => i.Username));
        Assert.Equal(new[] { "viewer", "annotator", "project-admin", "viewer" }, items.Select(i => i.Role));
        Assert.Equal(new[] { true, true, true, false }, items.Select(i => i.IsActive));
        Assert.All(items, i => Assert.True(i.UserId > 0));
        Assert.DoesNotContain(items, i => i.UserId == _admin.Id);
    }

    [Fact]
    public async Task ListMembers_of_a_project_without_members_is_empty()
    {
        _db.Projects.Add(new Project { Name = "Vacío" });
        await _db.SaveChangesAsync();
        var emptyId = (await _db.Projects.SingleAsync(p => p.Name == "Vacío")).Id;

        var result = await _controller.ListMembers(emptyId, CancellationToken.None);

        Assert.Empty(Body(result).Items);
    }

    [Fact]
    public async Task ListMembers_missing_project_responds_404()
    {
        await Assert.ThrowsAsync<NotFoundProblemException>(() => _controller.ListMembers(9_999, CancellationToken.None));
    }

    // ---- PATCH ----

    [Fact]
    public async Task UpdateMember_changes_the_role_and_touches_updated_at_only()
    {
        var before = await _db.ProjectMembers.AsNoTracking().SingleAsync(m => m.ProjectId == _p1.Id && m.UserId == _bob.Id);

        var result = await _controller.UpdateMember(
            _p1.Id, _bob.Id, new UpdateProjectMemberRequest { Role = "project-admin" }, CancellationToken.None);

        var body = Assert.IsType<ProjectMemberResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);
        Assert.Equal((_bob.Id, "bob", "project-admin", true), (body.UserId, body.Username, body.Role, body.IsActive));

        var after = await _db.ProjectMembers.AsNoTracking().SingleAsync(m => m.ProjectId == _p1.Id && m.UserId == _bob.Id);
        Assert.Equal(ProjectRole.ProjectAdmin, after.Role);
        Assert.Equal(before.CreatedAt, after.CreatedAt);
        Assert.Equal(before.GrantedByUserId, after.GrantedByUserId);
        Assert.True(after.UpdatedAt >= before.UpdatedAt);

        var otherProject = await _db.ProjectMembers.AsNoTracking().SingleAsync(m => m.ProjectId == _p2.Id && m.UserId == _bob.Id);
        Assert.Equal(ProjectRole.Viewer, otherProject.Role);
    }

    [Fact]
    public async Task UpdateMember_of_a_user_who_is_not_a_member_responds_404()
    {
        var ex = await Assert.ThrowsAsync<NotFoundProblemException>(() => _controller.UpdateMember(
            _p1.Id, _alice.Id, new UpdateProjectMemberRequest { Role = "viewer" }, CancellationToken.None));

        Assert.Equal(GiaProblemTypes.NotFound, ex.ProblemType);
        Assert.False(await _db.ProjectMembers.AnyAsync(m => m.ProjectId == _p1.Id && m.UserId == _alice.Id));
    }

    [Fact]
    public async Task UpdateMember_rejects_a_role_outside_the_ladder_when_called_without_model_validation()
    {
        await Assert.ThrowsAsync<ValidationProblemException>(() => _controller.UpdateMember(
            _p1.Id, _bob.Id, new UpdateProjectMemberRequest { Role = "owner" }, CancellationToken.None));

        var stored = await _db.ProjectMembers.AsNoTracking().SingleAsync(m => m.ProjectId == _p1.Id && m.UserId == _bob.Id);
        Assert.Equal(ProjectRole.Annotator, stored.Role);
    }

    // ---- DELETE ----

    [Fact]
    public async Task RemoveMember_deletes_only_that_membership_and_returns_204()
    {
        var result = await _controller.RemoveMember(_p1.Id, _bob.Id, CancellationToken.None);

        Assert.IsType<NoContentResult>(result);
        Assert.False(await _db.ProjectMembers.AnyAsync(m => m.ProjectId == _p1.Id && m.UserId == _bob.Id));
        Assert.True(await _db.ProjectMembers.AnyAsync(m => m.ProjectId == _p2.Id && m.UserId == _bob.Id));
        Assert.True(await _db.ProjectMembers.AnyAsync(m => m.ProjectId == _p1.Id && m.UserId == _boss.Id));
    }

    [Fact]
    public async Task RemoveMember_keeps_the_annotations_of_the_removed_user()
    {
        var dataset = new Dataset { Name = "DS", ProjectId = _p1.Id };
        _db.Datasets.Add(dataset);
        await _db.SaveChangesAsync();
        var labelClass = new LabelClass { Name = "NILM", DatasetId = dataset.Id };
        var image = new MedicalImage { DatasetId = dataset.Id, StorageKey = "datasets/1/a.png", OriginalFilename = "a.png", Kind = "conventional" };
        _db.LabelClasses.Add(labelClass);
        _db.Images.Add(image);
        await _db.SaveChangesAsync();
        _db.Annotations.Add(new Annotation { DatasetId = dataset.Id, ImageId = image.Id, ClassId = labelClass.Id, AuthorId = _bob.Id });
        await _db.SaveChangesAsync();

        await _controller.RemoveMember(_p1.Id, _bob.Id, CancellationToken.None);

        var annotation = await _db.Annotations.AsNoTracking().SingleAsync();
        Assert.Equal(_bob.Id, annotation.AuthorId);
        Assert.Null(annotation.DeletedAt);
    }

    [Fact]
    public async Task RemoveMember_of_a_user_who_is_not_a_member_responds_404()
    {
        var ex = await Assert.ThrowsAsync<NotFoundProblemException>(
            () => _controller.RemoveMember(_p1.Id, _alice.Id, CancellationToken.None));

        Assert.Equal(404, ex.StatusCode);
    }

    [Fact]
    public async Task RemoveMember_missing_project_responds_404()
    {
        await Assert.ThrowsAsync<NotFoundProblemException>(() => _controller.RemoveMember(9_999, _bob.Id, CancellationToken.None));
    }

    // ---- Validación de los DTO (la aplica el framework antes de la acción) ----

    private static List<ValidationResult> Validate(object instance)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(instance, new ValidationContext(instance), results, validateAllProperties: true);
        return results;
    }

    [Theory]
    [InlineData("alice", "viewer", true)]
    [InlineData("ana.perez-01_x", "project-admin", true)]
    [InlineData("al", "viewer", false)]
    [InlineData("Alice", "viewer", false)]
    [InlineData("alice smith", "viewer", false)]
    [InlineData("alice", "owner", false)]
    [InlineData("alice", "Viewer", false)]
    [InlineData("alice", "admin", false)]
    [InlineData("alice", "", false)]
    [InlineData("", "viewer", false)]
    public void AddProjectMemberRequest_validates_username_and_role(string username, string role, bool valid)
    {
        var errors = Validate(new AddProjectMemberRequest { Username = username, Role = role });

        Assert.Equal(valid, errors.Count == 0);
    }

    [Fact]
    public void ProjectRoleValue_accepts_exactly_the_roles_of_the_ladder()
    {
        foreach (var wire in ProjectRoles.All)
        {
            Assert.Empty(Validate(new UpdateProjectMemberRequest { Role = wire }));
        }

        Assert.NotEmpty(Validate(new UpdateProjectMemberRequest { Role = "owner" }));
        Assert.NotEmpty(Validate(new UpdateProjectMemberRequest { Role = string.Empty }));
    }

    /// <summary>Contexto que permite intervenir justo antes de confirmar, para simular una carrera o un fallo de base.</summary>
    private sealed class HookedDbContext : AppDbContext
    {
        public HookedDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public Func<Task>? BeforeSave { get; set; }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var hook = BeforeSave;
            BeforeSave = null;
            if (hook is not null)
            {
                await hook();
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }
}
