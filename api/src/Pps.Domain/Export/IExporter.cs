namespace Pps.Domain.Export;

public interface IExporter
{
    string FormatName { get; }
    Task<ExportResult> ExportDatasetAsync(long datasetId, CancellationToken cancellationToken = default);
}

public record ExportResult(string ContentType, byte[] Data, string Filename);
