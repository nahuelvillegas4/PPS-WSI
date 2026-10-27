namespace Pps.Domain.Import;

public interface IAnnotationImporter
{
    string Format { get; }
    Task<ImportReport> ImportAsync(long datasetId, long currentUserId, ImportRequest request, CancellationToken cancellationToken = default);
}
