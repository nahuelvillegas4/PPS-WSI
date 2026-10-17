namespace Pps.Domain.Import;

public interface IAnnotationImporter
{
    string FormatName { get; }
    Task<ImportResult> ImportAsync(Stream dataStream, ImportOptions options, CancellationToken cancellationToken = default);
}

public record ImportOptions(long DatasetId, bool DryRun);

public record ImportResult(int ImportedCount, int SkippedCount, IReadOnlyList<string> Warnings, IReadOnlyList<string> Errors);
