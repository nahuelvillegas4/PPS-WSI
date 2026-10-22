namespace Pps.Domain.Export;

public record ExportContext(
    long DatasetId,
    string ExportedByUsername,
    long CurrentUserId,
    string? AuthorsFilter = "me"
);

public record ExportResult(
    string ContentType, 
    byte[] Data, 
    string Filename
);

public interface IExporter
{
    string FormatName { get; }
    Task<ExportResult> ExportDatasetAsync(ExportContext context, CancellationToken cancellationToken = default);
}
