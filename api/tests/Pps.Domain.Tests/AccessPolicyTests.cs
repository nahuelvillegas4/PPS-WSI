namespace Pps.Domain.Tests;

using System.Text.Json;
using System.Text.RegularExpressions;
using Pps.Domain.Access;
using Xunit;

public class AccessPolicyTests
{
    private const long ProjectId = 42;

    public static IEnumerable<object[]> AllPermissions =>
        Enum.GetValues<Permission>().Select(p => new object[] { p });

    // Tabla del diseño (ADR-15, S9) escrita a mano: no se deriva de PermissionMatrix para no ser circular.
    public static TheoryData<ProjectRole, Permission, AccessVerdict> MemberRows => new()
    {
        { ProjectRole.Viewer, Permission.ProjectView, AccessVerdict.Allowed },
        { ProjectRole.Viewer, Permission.AnnotationWrite, AccessVerdict.Denied },
        { ProjectRole.Viewer, Permission.CatalogManage, AccessVerdict.Denied },
        { ProjectRole.Viewer, Permission.ImageUpload, AccessVerdict.Denied },
        { ProjectRole.Viewer, Permission.MemberManage, AccessVerdict.Denied },
        { ProjectRole.Viewer, Permission.DatasetExport, AccessVerdict.Denied },

        { ProjectRole.Annotator, Permission.ProjectView, AccessVerdict.Allowed },
        { ProjectRole.Annotator, Permission.AnnotationWrite, AccessVerdict.Allowed },
        { ProjectRole.Annotator, Permission.CatalogManage, AccessVerdict.Denied },
        { ProjectRole.Annotator, Permission.ImageUpload, AccessVerdict.Denied },
        { ProjectRole.Annotator, Permission.MemberManage, AccessVerdict.Denied },
        { ProjectRole.Annotator, Permission.DatasetExport, AccessVerdict.Denied },

        { ProjectRole.ProjectAdmin, Permission.ProjectView, AccessVerdict.Allowed },
        { ProjectRole.ProjectAdmin, Permission.AnnotationWrite, AccessVerdict.Allowed },
        { ProjectRole.ProjectAdmin, Permission.CatalogManage, AccessVerdict.Allowed },
        { ProjectRole.ProjectAdmin, Permission.ImageUpload, AccessVerdict.Allowed },
        { ProjectRole.ProjectAdmin, Permission.MemberManage, AccessVerdict.Allowed },
        { ProjectRole.ProjectAdmin, Permission.DatasetExport, AccessVerdict.Allowed },
    };

    // ---- AccessPolicy.Decide: rol x permiso x (inexistente | no miembro | miembro | admin global) ----

    [Theory]
    [MemberData(nameof(MemberRows))]
    public void Member_is_allowed_or_denied_by_the_role_ladder(ProjectRole role, Permission permission, AccessVerdict expected)
    {
        var decision = AccessPolicy.Decide(false, permission, new ScopeFacts(ProjectId, role));

        Assert.Equal(expected, decision.Verdict);
        Assert.Equal(role, decision.EffectiveRole);
        Assert.Equal(ProjectId, decision.ProjectId);
    }

    [Theory]
    [MemberData(nameof(AllPermissions))]
    public void Non_member_gets_hidden_for_every_permission(Permission permission)
    {
        var decision = AccessPolicy.Decide(false, permission, new ScopeFacts(ProjectId, null));

        Assert.Equal(new AccessDecision(AccessVerdict.Hidden, null, null), decision);
    }

    [Theory]
    [MemberData(nameof(AllPermissions))]
    public void Missing_resource_gets_hidden_for_everyone_including_the_global_admin(Permission permission)
    {
        Assert.Equal(new AccessDecision(AccessVerdict.Hidden, null, null), AccessPolicy.Decide(false, permission, null));
        Assert.Equal(new AccessDecision(AccessVerdict.Hidden, null, null), AccessPolicy.Decide(true, permission, null));
    }

    [Theory]
    [MemberData(nameof(AllPermissions))]
    public void Global_admin_is_allowed_as_project_admin_with_or_without_membership(Permission permission)
    {
        ProjectRole?[] memberRoles = [null, ProjectRole.Viewer, ProjectRole.Annotator, ProjectRole.ProjectAdmin];

        foreach (var memberRole in memberRoles)
        {
            var decision = AccessPolicy.Decide(true, permission, new ScopeFacts(ProjectId, memberRole));

            Assert.Equal(new AccessDecision(AccessVerdict.Allowed, ProjectRole.ProjectAdmin, ProjectId), decision);
        }
    }

    // ---- PermissionMatrix ----

    [Theory]
    [InlineData(Permission.ProjectView, ProjectRole.Viewer)]
    [InlineData(Permission.AnnotationWrite, ProjectRole.Annotator)]
    [InlineData(Permission.CatalogManage, ProjectRole.ProjectAdmin)]
    [InlineData(Permission.ImageUpload, ProjectRole.ProjectAdmin)]
    [InlineData(Permission.MemberManage, ProjectRole.ProjectAdmin)]
    [InlineData(Permission.DatasetExport, ProjectRole.ProjectAdmin)]
    public void PermissionMatrix_minimum_role_matches_the_design(Permission permission, ProjectRole expected)
    {
        Assert.Equal(expected, PermissionMatrix.MinimumRole(permission));
    }

    [Theory]
    [InlineData(Permission.ProjectView, "project.view")]
    [InlineData(Permission.AnnotationWrite, "annotation.write")]
    [InlineData(Permission.CatalogManage, "catalog.manage")]
    [InlineData(Permission.ImageUpload, "image.upload")]
    [InlineData(Permission.MemberManage, "member.manage")]
    [InlineData(Permission.DatasetExport, "dataset.export")]
    public void PermissionMatrix_wire_names_match_the_contract(Permission permission, string expected)
    {
        Assert.Equal(expected, PermissionMatrix.ToWire(permission));
    }

    [Fact]
    public void PermissionMatrix_covers_every_permission_with_a_distinct_wire_name()
    {
        var permissions = Enum.GetValues<Permission>();

        foreach (var permission in permissions)
        {
            Assert.True(Enum.IsDefined(PermissionMatrix.MinimumRole(permission)));
            Assert.False(string.IsNullOrWhiteSpace(PermissionMatrix.ToWire(permission)));
        }

        Assert.Equal(permissions.Length, permissions.Select(PermissionMatrix.ToWire).Distinct().Count());
    }

    [Fact]
    public void PermissionMatrix_rejects_an_undefined_permission()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => PermissionMatrix.MinimumRole((Permission)999));
        Assert.Throws<ArgumentOutOfRangeException>(() => PermissionMatrix.ToWire((Permission)999));
    }

    [Fact]
    public void PermissionMatrix_and_roles_agree_with_the_authorization_matrix_fixture()
    {
        var path = Path.Combine(FindRepoRoot(), "contract", "fixtures", "authorization-matrix.json");
        using var document = JsonDocument.Parse(File.ReadAllText(path));
        var root = document.RootElement;

        var fixturePermissions = root.GetProperty("permissions")
            .EnumerateObject()
            .ToDictionary(p => p.Name, p => p.Value.GetString());

        var permissions = Enum.GetValues<Permission>();
        Assert.Equal(permissions.Length, fixturePermissions.Count);
        foreach (var permission in permissions)
        {
            Assert.True(
                fixturePermissions.TryGetValue(PermissionMatrix.ToWire(permission), out var minimum),
                $"El fixture no declara el permiso '{PermissionMatrix.ToWire(permission)}'.");
            Assert.Equal(ProjectRoles.ToWire(PermissionMatrix.MinimumRole(permission)), minimum);
        }

        var projectRoles = root.GetProperty("roles").GetProperty("project").EnumerateArray().Select(e => e.GetString());
        var globalRoles = root.GetProperty("roles").GetProperty("global").EnumerateArray().Select(e => e.GetString());
        Assert.Equal(ProjectRoles.All, projectRoles);
        Assert.Equal(GlobalRoles.All, globalRoles);
    }

    // ---- ProjectRoles ----

    public static IEnumerable<object[]> AllRoles =>
        Enum.GetValues<ProjectRole>().Select(r => new object[] { r });

    [Theory]
    [MemberData(nameof(AllRoles))]
    public void ProjectRoles_round_trips_every_role_through_its_wire_value(ProjectRole role)
    {
        var wire = ProjectRoles.ToWire(role);

        Assert.True(ProjectRoles.TryParse(wire, out var parsed));
        Assert.Equal(role, parsed);
    }

    [Theory]
    [InlineData(ProjectRole.Viewer, "viewer")]
    [InlineData(ProjectRole.Annotator, "annotator")]
    [InlineData(ProjectRole.ProjectAdmin, "project-admin")]
    public void ProjectRoles_wire_values_match_the_contract(ProjectRole role, string expected)
    {
        Assert.Equal(expected, ProjectRoles.ToWire(role));
    }

    [Fact]
    public void ProjectRoles_All_follows_the_ladder_order()
    {
        Assert.Equal(new[] { "viewer", "annotator", "project-admin" }, ProjectRoles.All);
        Assert.Equal(
            Enum.GetValues<ProjectRole>().OrderBy(r => (int)r).Select(ProjectRoles.ToWire),
            ProjectRoles.All);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" viewer")]
    [InlineData("Viewer")]
    [InlineData("PROJECT-ADMIN")]
    [InlineData("project_admin")]
    [InlineData("admin")]
    [InlineData("user")]
    public void ProjectRoles_TryParse_rejects_anything_that_is_not_an_exact_wire_value(string? wire)
    {
        Assert.False(ProjectRoles.TryParse(wire, out _));
    }

    [Fact]
    public void ProjectRoles_ToWire_rejects_an_undefined_role()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => ProjectRoles.ToWire((ProjectRole)0));
        Assert.Throws<ArgumentOutOfRangeException>(() => ProjectRoles.ToWire((ProjectRole)99));
    }

    [Theory]
    [InlineData(ProjectRole.Viewer, new[] { "viewer", "annotator", "project-admin" })]
    [InlineData(ProjectRole.Annotator, new[] { "annotator", "project-admin" })]
    [InlineData(ProjectRole.ProjectAdmin, new[] { "project-admin" })]
    public void ProjectRoles_AtLeast_returns_the_wire_values_from_the_minimum_up(ProjectRole minimum, string[] expected)
    {
        Assert.Equal(expected, ProjectRoles.AtLeast(minimum));
    }

    // ---- GlobalRoles ----

    [Fact]
    public void GlobalRoles_are_admin_and_user_and_the_pattern_accepts_only_them()
    {
        Assert.Equal(new[] { "admin", "user" }, GlobalRoles.All);

        var pattern = new Regex(GlobalRoles.Pattern);
        Assert.Matches(pattern, GlobalRoles.Admin);
        Assert.Matches(pattern, GlobalRoles.User);
        Assert.DoesNotMatch(pattern, "annotator");
        Assert.DoesNotMatch(pattern, "Admin");
        Assert.DoesNotMatch(pattern, "admin ");
        Assert.DoesNotMatch(pattern, "");
    }

    private static string FindRepoRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            if (File.Exists(Path.Combine(current.FullName, "contract", "fixtures", "authorization-matrix.json")))
            {
                return current.FullName;
            }
            current = current.Parent;
        }

        throw new FileNotFoundException("No se encontró la raíz del repositorio.");
    }
}
