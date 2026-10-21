namespace Pps.Domain.Images;

public static class StorageKeyValidator
{
    private static readonly char[] InvalidPathChars = Path.GetInvalidPathChars();

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

        if (keyOrPrefix.IndexOfAny(InvalidPathChars) >= 0)
        {
            throw new InvalidStorageKeyException("La clave de almacenamiento contiene caracteres no válidos para una ruta.");
        }
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
