namespace Pps.Api.Controllers.Storage.Dtos;

public class StorageFileResponse
{
    public string StorageKey { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public string Kind { get; set; } = "other"; // "wsi" | "conventional" | "other"
    public List<long> RegisteredInDatasets { get; set; } = new();
}

public class StorageFileListResponse
{
    public List<StorageFileResponse> Items { get; set; } = new();
}
