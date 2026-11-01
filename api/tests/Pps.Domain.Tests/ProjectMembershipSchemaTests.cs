namespace Pps.Domain.Tests;

using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pps.Domain.Access;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Infrastructure.Persistence;
using Xunit;

/// <summary>
/// Esquema de <c>project_members</c> y de <c>users.role</c> con la convención snake_case, igual que
/// en producción: los CHECK escriben las columnas tal cual y no pasan por la convención.
/// </summary>
public class ProjectMembershipSchemaTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly User _user = new() { Username = "alice", PasswordHash = "hash" };
    private readonly Project _project = new() { Name = "Proyecto" };

    public ProjectMembershipSchemaTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .UseSnakeCaseNamingConvention()
            .Options;

        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();

        _db.Users.Add(_user);
        _db.Projects.Add(_project);
        _db.SaveChanges();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private Task<int> InsertMemberAsync(string role) =>
        _db.Database.ExecuteSqlRawAsync(
            "INSERT INTO project_members (project_id, user_id, role, created_at, updated_at) " +
            "VALUES ({0}, {1}, {2}, '2026-11-01 00:00:00', '2026-11-01 00:00:00')",
            _project.Id, _user.Id, role);

    [Fact]
    public async Task Check_constraint_rejects_a_project_role_outside_the_ladder()
    {
        var ex = await Assert.ThrowsAsync<SqliteException>(() => InsertMemberAsync("owner"));

        Assert.Contains("ck_project_members_role", ex.Message);
    }

    [Theory]
    [InlineData("viewer")]
    [InlineData("annotator")]
    [InlineData("project-admin")]
    public async Task Check_constraint_accepts_every_role_of_the_ladder(string role)
    {
        Assert.Equal(1, await InsertMemberAsync(role));
    }

    [Fact]
    public async Task Check_constraint_rejects_the_legacy_global_role_annotator()
    {
        var ex = await Assert.ThrowsAsync<SqliteException>(() =>
            _db.Database.ExecuteSqlRawAsync(
                "INSERT INTO users (username, password_hash, role, is_active, is_system, created_at) " +
                "VALUES ('legacy', 'hash', 'annotator', 1, 0, '2026-11-01 00:00:00')"));

        Assert.Contains("ck_users_role", ex.Message);
    }

    [Fact]
    public async Task Role_is_stored_as_the_wire_value_and_read_back_as_the_enum()
    {
        _db.ProjectMembers.Add(new ProjectMember
        {
            ProjectId = _project.Id,
            UserId = _user.Id,
            Role = ProjectRole.ProjectAdmin,
            GrantedByUserId = _user.Id
        });
        await _db.SaveChangesAsync();
        _db.ChangeTracker.Clear();

        var stored = await _db.Database
            .SqlQueryRaw<string>("SELECT role AS \"Value\" FROM project_members")
            .SingleAsync();
        var member = await _db.ProjectMembers.AsNoTracking().SingleAsync();

        Assert.Equal("project-admin", stored);
        Assert.Equal(ProjectRole.ProjectAdmin, member.Role);
        Assert.Equal(_user.Id, member.GrantedByUserId);
    }

    [Fact]
    public async Task Membership_is_unique_per_project_and_user()
    {
        Assert.Equal(1, await InsertMemberAsync("viewer"));

        await Assert.ThrowsAsync<SqliteException>(() => InsertMemberAsync("annotator"));
    }
}
