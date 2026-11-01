namespace Pps.Infrastructure.Persistence;

using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using Pps.Domain.Access;

/// <summary>
/// Guarda <see cref="ProjectRole"/> como su valor de cable ("viewer", "annotator", "project-admin"),
/// el mismo que usan el contrato y el CHECK <c>ck_project_members_role</c>.
/// </summary>
public sealed class ProjectRoleConverter : ValueConverter<ProjectRole, string>
{
    public ProjectRoleConverter() : base(role => ProjectRoles.ToWire(role), wire => FromWire(wire))
    {
    }

    private static ProjectRole FromWire(string wire) =>
        ProjectRoles.TryParse(wire, out var role)
            ? role
            : throw new InvalidOperationException($"El valor '{wire}' no es un rol de proyecto válido.");
}
