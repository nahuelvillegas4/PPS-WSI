namespace Pps.Domain.Tests;

using System.Data.Common;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Pps.Domain.Access;
using Pps.Domain.Annotations;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Infrastructure.Access;
using Pps.Infrastructure.Persistence;
using Xunit;

public class EfProjectAccessReaderTests : IDisposable
{
    private const long MissingId = 9_999;

    private readonly SqliteConnection _connection;
    private readonly CommandCounter _commands = new();
    private readonly AppDbContext _db;
    private readonly EfProjectAccessReader _reader;

    // Proyecto 1: alice (project-admin), bob (annotator), carol (viewer), erin (viewer, inactiva).
    // Proyecto 2: sin miembros. dave no es miembro de ningún proyecto.
    private readonly User _alice = new() { Username = "alice", PasswordHash = "hash", Role = "user" };
    private readonly User _bob = new() { Username = "bob", PasswordHash = "hash", Role = "user" };
    private readonly User _carol = new() { Username = "carol", PasswordHash = "hash", Role = "user" };
    private readonly User _dave = new() { Username = "dave", PasswordHash = "hash", Role = "user" };
    private readonly User _erin = new() { Username = "erin", PasswordHash = "hash", Role = "user", IsActive = false };

    private readonly Project _p1 = new() { Name = "Proyecto 1" };
    private readonly Project _p2 = new() { Name = "Proyecto 2" };
    private readonly Dataset _d1 = new() { Name = "Dataset 1" };
    private readonly Dataset _d2 = new() { Name = "Dataset 2" };
    private readonly LabelClass _c1 = new() { Name = "NILM" };
    private readonly LabelClass _c2 = new() { Name = "HSIL" };
    private readonly MedicalImage _i1 = new() { StorageKey = "datasets/1/a.png", OriginalFilename = "a.png", Kind = "conventional" };
    private readonly MedicalImage _i2 = new() { StorageKey = "datasets/2/b.png", OriginalFilename = "b.png", Kind = "conventional" };
    private readonly Annotation _a1 = new();
    private readonly Annotation _a2 = new();
    private readonly Annotation _deleted = new();

    public EfProjectAccessReaderTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .AddInterceptors(_commands)
            .Options;

        _db = new AppDbContext(options);
        _db.Database.EnsureCreated();
        Seed();

        // Lo sembrado no debe quedar en el rastreador: el lector tiene que ir siempre a la base.
        _db.ChangeTracker.Clear();
        _commands.Reset();
        _reader = new EfProjectAccessReader(_db);
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private void Seed()
    {
        _db.Users.AddRange(_alice, _bob, _carol, _dave, _erin);
        _db.Projects.AddRange(_p1, _p2);
        _db.SaveChanges();

        _d1.ProjectId = _p1.Id;
        _d2.ProjectId = _p2.Id;
        _db.Datasets.AddRange(_d1, _d2);
        _db.SaveChanges();

        _c1.DatasetId = _d1.Id;
        _c2.DatasetId = _d2.Id;
        _i1.DatasetId = _d1.Id;
        _i2.DatasetId = _d2.Id;
        _db.LabelClasses.AddRange(_c1, _c2);
        _db.Images.AddRange(_i1, _i2);
        _db.SaveChanges();

        _a1.DatasetId = _d1.Id;
        _a1.ImageId = _i1.Id;
        _a1.ClassId = _c1.Id;
        _a1.AuthorId = _alice.Id;
        _a2.DatasetId = _d2.Id;
        _a2.ImageId = _i2.Id;
        _a2.ClassId = _c2.Id;
        _a2.AuthorId = _alice.Id;
        _deleted.DatasetId = _d1.Id;
        _deleted.ImageId = _i1.Id;
        _deleted.ClassId = _c1.Id;
        _deleted.AuthorId = _alice.Id;
        _deleted.DeletedAt = DateTime.UtcNow;
        _db.Annotations.AddRange(_a1, _a2, _deleted);

        _db.ProjectMembers.AddRange(
            new ProjectMember { ProjectId = _p1.Id, UserId = _alice.Id, Role = ProjectRole.ProjectAdmin },
            new ProjectMember { ProjectId = _p1.Id, UserId = _bob.Id, Role = ProjectRole.Annotator },
            new ProjectMember { ProjectId = _p1.Id, UserId = _carol.Id, Role = ProjectRole.Viewer },
            new ProjectMember { ProjectId = _p1.Id, UserId = _erin.Id, Role = ProjectRole.Viewer });
        _db.SaveChanges();
    }

    public static IEnumerable<object[]> AllKinds =>
        Enum.GetValues<ScopeKind>().Select(k => new object[] { k });

    // Un recurso de cada tipo en el proyecto 1 y otro en el proyecto 2.
    private ScopeRef InProject1(ScopeKind kind) => kind switch
    {
        ScopeKind.Project => new ScopeRef(kind, _p1.Id),
        ScopeKind.Dataset => new ScopeRef(kind, _d1.Id),
        ScopeKind.Class => new ScopeRef(kind, _c1.Id),
        ScopeKind.Image => new ScopeRef(kind, _i1.Id),
        ScopeKind.Annotation => new ScopeRef(kind, _a1.Id),
        _ => throw new ArgumentOutOfRangeException(nameof(kind))
    };

    private ScopeRef InProject2(ScopeKind kind) => kind switch
    {
        ScopeKind.Project => new ScopeRef(kind, _p2.Id),
        ScopeKind.Dataset => new ScopeRef(kind, _d2.Id),
        ScopeKind.Class => new ScopeRef(kind, _c2.Id),
        ScopeKind.Image => new ScopeRef(kind, _i2.Id),
        ScopeKind.Annotation => new ScopeRef(kind, _a2.Id),
        _ => throw new ArgumentOutOfRangeException(nameof(kind))
    };

    // ---- FindScopeAsync ----

    [Theory]
    [MemberData(nameof(AllKinds))]
    public async Task FindScope_returns_the_project_and_the_role_of_each_member(ScopeKind kind)
    {
        var scope = InProject1(kind);

        Assert.Equal(new ScopeFacts(_p1.Id, ProjectRole.ProjectAdmin), await _reader.FindScopeAsync(_alice.Id, scope, default));
        Assert.Equal(new ScopeFacts(_p1.Id, ProjectRole.Annotator), await _reader.FindScopeAsync(_bob.Id, scope, default));
        Assert.Equal(new ScopeFacts(_p1.Id, ProjectRole.Viewer), await _reader.FindScopeAsync(_carol.Id, scope, default));
    }

    [Theory]
    [MemberData(nameof(AllKinds))]
    public async Task FindScope_returns_the_project_without_role_for_a_non_member(ScopeKind kind)
    {
        var facts = await _reader.FindScopeAsync(_dave.Id, InProject1(kind), default);

        Assert.Equal(new ScopeFacts(_p1.Id, null), facts);
    }

    [Theory]
    [MemberData(nameof(AllKinds))]
    public async Task FindScope_does_not_carry_a_role_over_to_another_project(ScopeKind kind)
    {
        // alice administra el proyecto 1, pero en el proyecto 2 no es miembro.
        var facts = await _reader.FindScopeAsync(_alice.Id, InProject2(kind), default);

        Assert.Equal(new ScopeFacts(_p2.Id, null), facts);
    }

    [Theory]
    [MemberData(nameof(AllKinds))]
    public async Task FindScope_returns_null_when_the_resource_does_not_exist(ScopeKind kind)
    {
        Assert.Null(await _reader.FindScopeAsync(_alice.Id, new ScopeRef(kind, MissingId), default));
    }

    [Fact]
    public async Task FindScope_treats_a_soft_deleted_annotation_as_nonexistent()
    {
        var live = await _reader.FindScopeAsync(_alice.Id, new ScopeRef(ScopeKind.Annotation, _a1.Id), default);
        var deleted = await _reader.FindScopeAsync(_alice.Id, new ScopeRef(ScopeKind.Annotation, _deleted.Id), default);

        Assert.NotNull(live);
        Assert.Null(deleted);
    }

    [Fact]
    public async Task FindScope_gives_no_role_to_an_unknown_user()
    {
        var facts = await _reader.FindScopeAsync(MissingId, InProject1(ScopeKind.Dataset), default);

        Assert.Equal(new ScopeFacts(_p1.Id, null), facts);
    }

    [Theory]
    [MemberData(nameof(AllKinds))]
    public async Task FindScope_is_a_single_read_only_query(ScopeKind kind)
    {
        _commands.Reset();

        var facts = await _reader.FindScopeAsync(_bob.Id, InProject1(kind), default);

        Assert.NotNull(facts);
        Assert.Equal(1, _commands.Count);
        Assert.Empty(_db.ChangeTracker.Entries());
    }

    // ---- FindImageForTileAsync ----

    [Fact]
    public async Task FindImageForTile_returns_key_activity_and_membership_of_a_member()
    {
        var facts = await _reader.FindImageForTileAsync(_carol.Id, _i1.Id, default);

        Assert.Equal(new TileAccessFacts("datasets/1/a.png", true, new ScopeFacts(_p1.Id, ProjectRole.Viewer)), facts);
    }

    [Fact]
    public async Task FindImageForTile_returns_no_role_for_a_non_member()
    {
        var facts = await _reader.FindImageForTileAsync(_dave.Id, _i1.Id, default);

        Assert.Equal(new TileAccessFacts("datasets/1/a.png", true, new ScopeFacts(_p1.Id, null)), facts);
    }

    [Fact]
    public async Task FindImageForTile_does_not_carry_a_role_over_to_another_project()
    {
        var facts = await _reader.FindImageForTileAsync(_alice.Id, _i2.Id, default);

        Assert.Equal(new TileAccessFacts("datasets/2/b.png", true, new ScopeFacts(_p2.Id, null)), facts);
    }

    [Fact]
    public async Task FindImageForTile_reports_an_inactive_user_even_if_still_a_member()
    {
        var facts = await _reader.FindImageForTileAsync(_erin.Id, _i1.Id, default);

        Assert.Equal(new TileAccessFacts("datasets/1/a.png", false, new ScopeFacts(_p1.Id, ProjectRole.Viewer)), facts);
    }

    [Fact]
    public async Task FindImageForTile_reports_an_unknown_user_as_inactive_and_without_role()
    {
        var facts = await _reader.FindImageForTileAsync(MissingId, _i1.Id, default);

        Assert.Equal(new TileAccessFacts("datasets/1/a.png", false, new ScopeFacts(_p1.Id, null)), facts);
    }

    [Fact]
    public async Task FindImageForTile_returns_null_when_the_image_does_not_exist()
    {
        Assert.Null(await _reader.FindImageForTileAsync(_alice.Id, MissingId, default));
    }

    [Fact]
    public async Task FindImageForTile_is_a_single_read_only_query()
    {
        _commands.Reset();

        var facts = await _reader.FindImageForTileAsync(_bob.Id, _i1.Id, default);

        Assert.NotNull(facts);
        Assert.Equal(1, _commands.Count);
        Assert.Empty(_db.ChangeTracker.Entries());
    }

    private sealed class CommandCounter : DbCommandInterceptor
    {
        public int Count { get; private set; }

        public void Reset() => Count = 0;

        public override InterceptionResult<DbDataReader> ReaderExecuting(
            DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result)
        {
            Count++;
            return result;
        }

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default)
        {
            Count++;
            return new ValueTask<InterceptionResult<DbDataReader>>(result);
        }
    }
}
