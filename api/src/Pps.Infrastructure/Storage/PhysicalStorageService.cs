namespace Pps.Infrastructure.Storage;

using Microsoft.Extensions.Logging;
using Pps.Domain.Images;

public class PhysicalStorageService : IStorageService
{
    private readonly string _basePath;
    private readonly ILogger<PhysicalStorageService> _logger;

    public PhysicalStorageService(string basePath, ILogger<PhysicalStorageService> logger)
    {
        _basePath = Path.GetFullPath(basePath);
        _logger = logger;
    }

    public string BasePath => _basePath;

    public IReadOnlyList<StorageItem> ListFiles(string? prefix = null)
    {
        StorageKeyValidator.Validate(prefix, allowEmpty: true);

        if (!Directory.Exists(_basePath))
        {
            _logger.LogWarning("El directorio base de almacenamiento '{BasePath}' no existe.", _basePath);
            return Array.Empty<StorageItem>();
        }

        var normalizedPrefix = prefix?.TrimStart('/');

        var result = new List<StorageItem>();
        var dirInfo = new DirectoryInfo(_basePath);

        foreach (var file in dirInfo.EnumerateFiles("*", SearchOption.AllDirectories))
        {
            // Omitir archivos ocultos o de metadatos del sistema
            if (file.Name.StartsWith('.') || file.DirectoryName?.Contains(Path.DirectorySeparatorChar + ".") == true)
            {
                continue;
            }

            var relativePath = Path.GetRelativePath(_basePath, file.FullName);
            var storageKey = relativePath.Replace('\\', '/');

            if (!string.IsNullOrEmpty(normalizedPrefix) &&
                !storageKey.StartsWith(normalizedPrefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var kind = StorageKeyValidator.ClassifyKind(file.Extension);
            result.Add(new StorageItem(storageKey, file.Length, kind));
        }

        return result.OrderBy(x => x.StorageKey, StringComparer.Ordinal).ToList();
    }

    public bool FileExists(string storageKey)
    {
        try
        {
            var fullPath = GetFullPath(storageKey);
            return File.Exists(fullPath);
        }
        catch (InvalidStorageKeyException)
        {
            return false;
        }
    }

    public string GetFullPath(string storageKey)
    {
        StorageKeyValidator.Validate(storageKey, allowEmpty: false);

        var combined = Path.GetFullPath(Path.Combine(_basePath, storageKey.Replace('/', Path.DirectorySeparatorChar)));
        var baseDirWithSeparator = _basePath.EndsWith(Path.DirectorySeparatorChar.ToString())
            ? _basePath
            : _basePath + Path.DirectorySeparatorChar;

        if (!combined.StartsWith(baseDirWithSeparator, StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(combined, _basePath, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidStorageKeyException($"La clave de almacenamiento '{storageKey}' escapa del directorio base.");
        }

        return combined;
    }
}
