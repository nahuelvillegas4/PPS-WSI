namespace Pps.Api.Controllers.Images.Dtos;

public class ImageResponse
{
    public long Id { get; set; }
    public long DatasetId { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Kind { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
    public int Width { get; set; }
    public int Height { get; set; }
    public int LevelCount { get; set; }
    public double? MppX { get; set; }
    public double? MppY { get; set; }
    public string TileSourceUrl { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; }
}

public class RegisterImagesResponse
{
    public List<ImageResponse> Items { get; set; } = new();
}

public class ImagePageResponse
{
    public List<ImageResponse> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int Total { get; set; }
}
