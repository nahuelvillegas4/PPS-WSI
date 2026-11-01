namespace Pps.Domain.Access;

/// <summary>Hechos de acceso de una imagen para <c>tile-access</c>: la clave de almacenamiento, si el usuario sigue activo y su membresía.</summary>
public sealed record TileAccessFacts(string StorageKey, bool UserIsActive, ScopeFacts Scope);

/// <summary>
/// Puerto de lectura de la membresía. Cada llamada es una única consulta SQL de solo lectura.
/// </summary>
public interface IProjectAccessReader
{
    /// <summary>
    /// Proyecto del recurso y rol del usuario en él; <c>null</c> si el recurso no existe
    /// (las anotaciones borradas lógicamente cuentan como inexistentes).
    /// </summary>
    Task<ScopeFacts?> FindScopeAsync(long userId, ScopeRef scope, CancellationToken ct);

    /// <summary>Hechos de <c>tile-access</c> de una imagen; <c>null</c> si la imagen no existe.</summary>
    Task<TileAccessFacts?> FindImageForTileAsync(long userId, long imageId, CancellationToken ct);
}
