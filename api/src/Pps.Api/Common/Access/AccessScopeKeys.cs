namespace Pps.Api.Common.Access;

using Pps.Domain.Access;

/// <summary>
/// Claves de ruta de las que se deduce el proyecto de una operación. Una acción con
/// <see cref="RequirePermissionAttribute"/> debe tener exactamente una.
/// </summary>
public static class AccessScopeKeys
{
    private static readonly IReadOnlyDictionary<string, ScopeKind> KindsByKey =
        new Dictionary<string, ScopeKind>(StringComparer.OrdinalIgnoreCase)
        {
            ["projectId"] = ScopeKind.Project,
            ["datasetId"] = ScopeKind.Dataset,
            ["classId"] = ScopeKind.Class,
            ["imageId"] = ScopeKind.Image,
            ["annotationId"] = ScopeKind.Annotation
        };

    /// <summary>Las claves de ámbito, tal como se escriben en las plantillas de ruta.</summary>
    public static IReadOnlyCollection<string> All { get; } = KindsByKey.Keys.ToArray();

    public static bool TryGetKind(string key, out ScopeKind kind) => KindsByKey.TryGetValue(key, out kind);
}
