namespace Pps.Domain.Images;

public record ImageInspectionResult(
    string StorageKey,
    string Format,
    string Kind,
    int Width,
    int Height,
    int LevelCount,
    double? MppX,
    double? MppY,
    long FileSizeBytes
);

public interface IImageInspector
{
    Task<ImageInspectionResult> InspectAsync(string storageKey, CancellationToken cancellationToken = default);
}
