namespace Pps.Domain.Images;

using System.Text.RegularExpressions;

public static class StorageKeyValidator
{
    private const int MaxKeyLength = 1024;
    private static readonly char[] InvalidPathChars = Path.GetInvalidPathChars();
    private static readonly Regex UnsafeFileNameChars = new(@"[^a-zA-Z0-9._\-]+", RegexOptions.Compiled);

    public static void Validate(string? keyOrPrefix, bool allowEmpty = false)
    {
        if (string.IsNullOrEmpty(keyOrPrefix))
        {
            if (allowEmpty)
            {
                return;
            }
            throw new InvalidStorageKeyException("La clave de almacenamiento no puede estar vacía.");
        }

        if (keyOrPrefix != keyOrPrefix.Trim())
        {
            throw new InvalidStorageKeyException("La clave de almacenamiento no debe tener espacios al inicio o al final.");
        }

        if (keyOrPrefix.Length > MaxKeyLength)
        {
            throw new InvalidStorageKeyException("La clave de almacenamiento supera la longitud máxima permitida.");
        }

        if (keyOrPrefix.StartsWith('/') || keyOrPrefix.StartsWith('\\'))
        {
            throw new InvalidStorageKeyException("La clave de almacenamiento debe ser una ruta relativa sin barra inicial.");
        }

        if (keyOrPrefix.Contains(':'))
        {
            throw new InvalidStorageKeyException("La clave de almacenamiento no debe contener caracteres de unidad de disco ni dos puntos.");
        }

        if (keyOrPrefix.Contains('\\'))
        {
            throw new InvalidStorageKeyException("La clave de almacenamiento debe utilizar exclusivamente '/' como separador de directorios.");
        }

        if (keyOrPrefix.Contains(".."))
        {
            throw new InvalidStorageKeyException("No se permiten secuencias de escape de directorio ('..').");
        }

        if (keyOrPrefix.IndexOfAny(InvalidPathChars) >= 0 || keyOrPrefix.Contains('\0'))
        {
            throw new InvalidStorageKeyException("La clave de almacenamiento contiene caracteres no válidos para una ruta.");
        }

        var parts = keyOrPrefix.TrimEnd('/').Split('/');
        if (parts.Any(p => string.IsNullOrEmpty(p) || p == "." || p == ".."))
        {
            throw new InvalidStorageKeyException("La clave de almacenamiento no admite segmentos vacíos, '.' ni '..'.");
        }
    }

    public static string SanitizeFileName(string? rawFileName)
    {
        if (string.IsNullOrWhiteSpace(rawFileName))
        {
            throw new InvalidStorageKeyException("El nombre de archivo no puede estar vacío.");
        }

        var normalized = rawFileName.Trim().Replace('\\', '/');
        var lastSlash = normalized.LastIndexOf('/');
        var fileName = lastSlash >= 0 ? normalized[(lastSlash + 1)..] : normalized;

        if (string.IsNullOrWhiteSpace(fileName) || fileName == "." || fileName == ".." || fileName.StartsWith('.'))
        {
            throw new InvalidStorageKeyException($"El nombre de archivo '{rawFileName}' no es válido.");
        }

        var extension = Path.GetExtension(fileName);
        var stem = Path.GetFileNameWithoutExtension(fileName);

        var safeStem = UnsafeFileNameChars.Replace(stem, "_").Trim('_', '.');
        if (string.IsNullOrWhiteSpace(safeStem))
        {
            safeStem = "image";
        }

        var safeExt = UnsafeFileNameChars.Replace(extension, string.Empty).ToLowerInvariant();
        var sanitized = $"{safeStem}{safeExt}";

        Validate(sanitized, allowEmpty: false);
        return sanitized;
    }

    public static string BuildDatasetStorageKey(long datasetId, string? rawFileName)
    {
        if (datasetId <= 0)
        {
            throw new InvalidStorageKeyException("El identificador del dataset debe ser positivo.");
        }

        var safeFileName = SanitizeFileName(rawFileName);
        var kind = ClassifyKind(Path.GetExtension(safeFileName));
        if (kind == "other")
        {
            throw new UnsupportedImageFormatException(rawFileName ?? safeFileName);
        }

        var storageKey = $"datasets/{datasetId}/{safeFileName}";
        Validate(storageKey, allowEmpty: false);
        return storageKey;
    }

    public static string ClassifyKind(string extension)
    {
        var ext = extension.TrimStart('.').ToLowerInvariant();
        return ext switch
        {
            "svs" => "wsi",
            "png" or "jpg" or "jpeg" => "conventional",
            _ => "other"
        };
    }
}
