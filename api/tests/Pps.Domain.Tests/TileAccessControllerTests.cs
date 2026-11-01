namespace Pps.Domain.Tests;

using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Pps.Api.Controllers.Internal;
using Pps.Domain.Access;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Infrastructure.Access;
using Pps.Infrastructure.Persistence;
using Xunit;

/// <summary>
/// <c>tile-access</c> con membresía real (SQLite). Nginx solo admite 204, 401 y 403:
/// usuario inactivo 401; imagen inexistente o sin membresía 403; miembro (viewer o más) y administrador global 204.
/// </summary>
public class TileAccessControllerTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _db;
    private readonly TileAccessController _controller;

    private readonly User _admin = new() { Username = "admin", PasswordHash = "hash", Role = GlobalRoles.Admin };
    private readonly User _viewer = new() { Username = "viewer1", PasswordHash = "hash", Role = GlobalRoles.User };
    private readonly User _annotator = new() { Username = "annot1", PasswordHash = "hash", Role = GlobalRoles.User };
    private readonly User _outsider = new() { Username = "outsider", PasswordHash = "hash", Role = GlobalRoles.User };
    private readonly User _inactiveMember = new() { Username = "inactive", PasswordHash = "hash", Role = GlobalRoles.User, IsActive = false };
    private readonly User _inactiveAdmin = new() { Username = "oldadmin", PasswordHash = "hash", Role = GlobalRoles.Admin, IsActive = false };

    private readonly Project _p1 = new() { Name = "Proyecto 1" };
    private readonly Project _p2 = new() { Name = "Proyecto 2" };
    private readonly Dataset _d1 = new() { Name = "DS 1" };
    private readonly Dataset _d2 = new() { Name = "DS 2" };
    private readonly MedicalImage _i1 = new() { StorageKey = "datasets/1/a.svs", OriginalFilename = "a.svs", Kind = "wsi" };
    private readonly MedicalImage _i2 = new() { StorageKey = "datasets/2/b.svs", OriginalFilename = "b.svs", Kind = "wsi" };

    public TileAccessControllerTests()
    {
        _connection = AccessTestSupport.OpenConnection();
        _db = AccessTestSupport.CreateDb(_connection);

        _db.Users.AddRange(_admin, _viewer, _annotator, _outsider, _inactiveMember, _inactiveAdmin);
        _db.Projects.AddRange(_p1, _p2);
        _db.SaveChanges();

        _d1.ProjectId = _p1.Id;
        _d2.ProjectId = _p2.Id;
        _db.Datasets.AddRange(_d1, _d2);
        _db.SaveChanges();

        _i1.DatasetId = _d1.Id;
        _i2.DatasetId = _d2.Id;
        _db.Images.AddRange(_i1, _i2);
        _db.ProjectMembers.AddRange(
            new ProjectMember { ProjectId = _p1.Id, UserId = _viewer.Id, Role = ProjectRole.Viewer },
            new ProjectMember { ProjectId = _p1.Id, UserId = _annotator.Id, Role = ProjectRole.Annotator },
            new ProjectMember { ProjectId = _p1.Id, UserId = _inactiveMember.Id, Role = ProjectRole.Viewer });
        _db.SaveChanges();
        _db.ChangeTracker.Clear();

        _controller = new TileAccessController(new EfProjectAccessReader(_db));
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private async Task<IActionResult> CheckAsync(User user, string? originalUri)
    {
        AccessTestSupport.SetUser(_controller, user.Id, user.Username, user.Role);
        return await _controller.CheckTileAccess(originalUri, CancellationToken.None);
    }

    private string StorageKeyHeader() => _controller.Response.Headers["X-Storage-Key"].ToString();

    private string TileUri(MedicalImage image) => $"/tiles/v1/images/{image.Id}.dzi";

    [Fact]
    public async Task Viewer_member_gets_204_with_the_storage_key()
    {
        var result = await CheckAsync(_viewer, TileUri(_i1));

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("datasets/1/a.svs", StorageKeyHeader());
    }

    [Fact]
    public async Task Annotator_member_gets_204()
    {
        Assert.IsType<NoContentResult>(await CheckAsync(_annotator, TileUri(_i1)));
    }

    [Theory]
    [InlineData("/tiles/v1/images/{0}.dzi")]
    [InlineData("/tiles/v1/images/{0}_files/12/3_4.jpeg")]
    [InlineData("/tiles/v1/images/{0}")]
    public async Task Tile_urls_of_the_same_image_resolve_to_the_same_image(string template)
    {
        var result = await CheckAsync(_viewer, string.Format(template, _i1.Id));

        Assert.IsType<NoContentResult>(result);
        Assert.Equal("datasets/1/a.svs", StorageKeyHeader());
    }

    [Fact]
    public async Task Non_member_gets_403_and_no_storage_key()
    {
        var result = await CheckAsync(_outsider, TileUri(_i1));

        Assert.IsType<ForbidResult>(result);
        Assert.False(_controller.Response.Headers.ContainsKey("X-Storage-Key"));
    }

    [Fact]
    public async Task Member_of_another_project_gets_403_for_this_image()
    {
        // _viewer es miembro del proyecto 1 y no del 2.
        Assert.IsType<ForbidResult>(await CheckAsync(_viewer, TileUri(_i2)));
    }

    [Fact]
    public async Task Missing_image_gets_403_not_404()
    {
        Assert.IsType<ForbidResult>(await CheckAsync(_viewer, "/tiles/v1/images/999999.dzi"));
        Assert.IsType<ForbidResult>(await CheckAsync(_admin, "/tiles/v1/images/999999.dzi"));
    }

    [Fact]
    public async Task Inactive_user_gets_401_even_if_still_a_member()
    {
        var result = await CheckAsync(_inactiveMember, TileUri(_i1));

        Assert.IsType<UnauthorizedResult>(result);
        Assert.False(_controller.Response.Headers.ContainsKey("X-Storage-Key"));
    }

    [Fact]
    public async Task Inactive_global_admin_gets_401()
    {
        Assert.IsType<UnauthorizedResult>(await CheckAsync(_inactiveAdmin, TileUri(_i1)));
    }

    [Fact]
    public async Task Global_admin_gets_204_for_any_image_without_membership()
    {
        Assert.IsType<NoContentResult>(await CheckAsync(_admin, TileUri(_i1)));
        Assert.Equal("datasets/1/a.svs", StorageKeyHeader());

        Assert.IsType<NoContentResult>(await CheckAsync(_admin, TileUri(_i2)));
        Assert.Equal("datasets/2/b.svs", StorageKeyHeader());
    }

    [Fact]
    public async Task Removing_the_membership_revokes_tile_access()
    {
        Assert.IsType<NoContentResult>(await CheckAsync(_viewer, TileUri(_i1)));

        _db.ProjectMembers.Remove(_db.ProjectMembers.Single(m => m.UserId == _viewer.Id));
        await _db.SaveChangesAsync();

        Assert.IsType<ForbidResult>(await CheckAsync(_viewer, TileUri(_i1)));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("/tiles/v1/other/7.dzi")]
    [InlineData("/tiles/v1/images/abc.dzi")]
    public async Task Missing_or_malformed_original_uri_gets_403(string? originalUri)
    {
        Assert.IsType<ForbidResult>(await CheckAsync(_admin, originalUri));
    }

    [Fact]
    public async Task Session_without_a_user_id_claim_gets_401()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, "ghost") }, "Cookie"));
        _controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = principal } };

        Assert.IsType<UnauthorizedResult>(await _controller.CheckTileAccess(TileUri(_i1), CancellationToken.None));
    }
}
