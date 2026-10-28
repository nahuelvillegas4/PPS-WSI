namespace Pps.Domain.Export.Coco;

using System.Text.Json.Serialization;

public class CocoExportDocument
{
    [JsonPropertyName("info")]
    public CocoInfo Info { get; set; } = new();

    [JsonPropertyName("licenses")]
    public List<CocoLicense> Licenses { get; set; } = new();

    [JsonPropertyName("images")]
    public List<CocoImage> Images { get; set; } = new();

    [JsonPropertyName("annotations")]
    public List<CocoAnnotation> Annotations { get; set; } = new();

    [JsonPropertyName("categories")]
    public List<CocoCategory> Categories { get; set; } = new();
}

public class CocoInfo
{
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0";

    [JsonPropertyName("year")]
    public int Year { get; set; }

    [JsonPropertyName("contributor")]
    public string Contributor { get; set; } = string.Empty;

    [JsonPropertyName("date_created")]
    public string DateCreated { get; set; } = string.Empty;
}

public class CocoLicense
{
    [JsonPropertyName("id")]
    public int Id { get; set; } = 1;

    [JsonPropertyName("name")]
    public string Name { get; set; } = "Proprietary";

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

public class CocoImage
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("width")]
    public long Width { get; set; }

    [JsonPropertyName("height")]
    public long Height { get; set; }

    [JsonPropertyName("file_name")]
    public string FileName { get; set; } = string.Empty;

    [JsonPropertyName("license")]
    public int License { get; set; } = 1;

    [JsonPropertyName("date_captured")]
    public string? DateCaptured { get; set; }
}

public class CocoAnnotation
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("image_id")]
    public long ImageId { get; set; }

    [JsonPropertyName("category_id")]
    public long CategoryId { get; set; }

    [JsonPropertyName("bbox")]
    public double[] Bbox { get; set; } = Array.Empty<double>();

    [JsonPropertyName("segmentation")]
    public List<double[]> Segmentation { get; set; } = new();

    [JsonPropertyName("area")]
    public double Area { get; set; }

    [JsonPropertyName("iscrowd")]
    public int IsCrowd { get; set; } = 0;
}

public class CocoCategory
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("supercategory")]
    public string Supercategory { get; set; } = "none";
}
