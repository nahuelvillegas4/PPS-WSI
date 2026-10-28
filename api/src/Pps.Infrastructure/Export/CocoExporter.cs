namespace Pps.Infrastructure.Export;

using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pps.Domain.Annotations;
using Pps.Domain.Export;
using Pps.Domain.Export.Coco;
using Pps.Infrastructure.Persistence;

public class CocoExporter : IExporter
{
    private static readonly JsonSerializerOptions GeometryJsonOptions = new()
    {
        AllowOutOfOrderMetadataProperties = true
    };

    private static readonly JsonSerializerOptions ExportSerializerOptions = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private readonly AppDbContext _db;
    private readonly ILogger<CocoExporter> _logger;

    public CocoExporter(AppDbContext db, ILogger<CocoExporter> logger)
    {
        _db = db;
        _logger = logger;
    }

    public string FormatName => "coco";

    public async Task<ExportResult> ExportDatasetAsync(ExportContext context, CancellationToken cancellationToken = default)
    {
        var (isAll, userIds) = AuthorsFilterParser.Parse(context.AuthorsFilter, context.CurrentUserId);

        var dataset = await _db.Datasets
            .AsNoTracking()
            .Include(d => d.Project)
            .FirstOrDefaultAsync(d => d.Id == context.DatasetId, cancellationToken);

        if (dataset == null)
        {
            throw new KeyNotFoundException($"No se encontró el dataset con ID {context.DatasetId}.");
        }

        var classes = await _db.LabelClasses
            .AsNoTracking()
            .Where(c => c.DatasetId == context.DatasetId)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Id)
            .ToListAsync(cancellationToken);

        var images = await _db.Images
            .AsNoTracking()
            .Where(i => i.DatasetId == context.DatasetId)
            .OrderBy(i => i.Id)
            .ToListAsync(cancellationToken);

        var annotationsQuery = _db.Annotations
            .AsNoTracking()
            .Where(a => a.DatasetId == context.DatasetId && a.DeletedAt == null);

        if (!isAll)
        {
            annotationsQuery = annotationsQuery.Where(a => userIds!.Contains(a.AuthorId));
        }

        var annotations = await annotationsQuery
            .OrderBy(a => a.Id)
            .ToListAsync(cancellationToken);

        var cocoCategories = classes.Select(c => new CocoCategory
        {
            Id = c.Id,
            Name = c.Name,
            Supercategory = "none"
        }).ToList();

        var cocoImages = images.Select(img => new CocoImage
        {
            Id = img.Id,
            Width = img.WidthL0,
            Height = img.HeightL0,
            FileName = img.StorageKey,
            License = 1,
            DateCaptured = null
        }).ToList();

        var cocoAnnotations = new List<CocoAnnotation>(annotations.Count);
        foreach (var a in annotations)
        {
            var geom = JsonSerializer.Deserialize<Geometry>(a.GeometryJson, GeometryJsonOptions)!;
            var (bbox, segmentation, area) = CocoGeometryConverter.Convert(geom);

            cocoAnnotations.Add(new CocoAnnotation
            {
                Id = a.Id,
                ImageId = a.ImageId,
                CategoryId = a.ClassId,
                Bbox = bbox,
                Segmentation = segmentation,
                Area = area,
                IsCrowd = 0
            });
        }

        var doc = new CocoExportDocument
        {
            Info = new CocoInfo
            {
                Description = dataset.Name,
                Version = "1.0",
                Year = DateTime.UtcNow.Year,
                Contributor = context.ExportedByUsername,
                DateCreated = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")
            },
            Licenses = new List<CocoLicense>
            {
                new() { Id = 1, Name = "Proprietary", Url = string.Empty }
            },
            Images = cocoImages,
            Annotations = cocoAnnotations,
            Categories = cocoCategories
        };

        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(doc, ExportSerializerOptions);
        var slug = ExportSlugifier.Slugify(dataset.Name, dataset.Id);
        var filename = $"{slug}-coco.json";

        _logger.LogInformation(
            "Exportado dataset {DatasetId} ({Format}) con {AnnotationsCount} anotaciones a '{Filename}'.",
            dataset.Id, FormatName, annotations.Count, filename);

        return new ExportResult("application/json", jsonBytes, filename);
    }
}
