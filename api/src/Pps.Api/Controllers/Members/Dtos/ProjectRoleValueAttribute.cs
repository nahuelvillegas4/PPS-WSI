namespace Pps.Api.Controllers.Members.Dtos;

using System.ComponentModel.DataAnnotations;
using Pps.Domain.Access;

/// <summary>
/// Valida que el valor sea un rol de proyecto del contrato ("viewer", "annotator" o "project-admin").
/// Se apoya en <see cref="ProjectRoles"/> para que un rol nuevo no pueda desfasarse de este chequeo.
/// </summary>
[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public sealed class ProjectRoleValueAttribute : ValidationAttribute
{
    public ProjectRoleValueAttribute()
        : base(() => $"The role must be one of: {string.Join(", ", ProjectRoles.All)}.")
    {
    }

    public override bool IsValid(object? value) =>
        value is string wire && ProjectRoles.TryParse(wire, out _);
}
