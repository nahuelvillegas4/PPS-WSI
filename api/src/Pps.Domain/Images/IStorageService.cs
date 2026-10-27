namespace Pps.Domain.Images;

public record StorageItem(
    string StorageKey,
    long SizeBytes,
    string Kind
);

public interface IStorageService
{
    string BasePath { get; }
    IReadOnlyList<StorageItem> ListFiles(string? prefix = null);
    bool FileExists(string storageKey);
    string GetFullPath(string storageKey);
    Task<long> SaveFileAsync(string storageKey, Stream content, CancellationToken cancellationToken = default);
    void DeleteFile(string storageKey);
}
