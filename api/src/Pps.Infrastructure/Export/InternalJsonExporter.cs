namespace Pps.Infrastructure.Export;

using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pps.Domain.Annotations;
using Pps.Domain.Export;
using Pps.Domain.Export.Internal;
using Pps.Infrastructure.Persistence;

public class InternalJsonExporter : IExporter
{
    private static readonly JsonSerializerOptions GeometryJsonOptions = new()
    {
        AllowOutOfOrderMetadataProperties = true
    };

    private static readonly JsonSerializerOptions ExportSerializerOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.Never,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private readonly AppDbContext _db;
    private readonly ILogger<InternalJsonExporter> _logger;

    public InternalJsonExporter(AppDbContext db, ILogger<InternalJsonExporter> logger)
    {
        _db = db;
        _logger = logger;
    }

    public string FormatName => "internal";

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
            .Include(a => a.Author)
            .Where(a => a.DatasetId == context.DatasetId && a.DeletedAt == null);

        if (!isAll)
        {
            annotationsQuery = annotationsQuery.Where(a => userIds!.Contains(a.AuthorId));
        }

        var annotations = await annotationsQuery
            .OrderBy(a => a.Id)
            .ToListAsync(cancellationToken);

        var annotationsByImage = annotations.ToLookup(a => a.ImageId);

        var authors = annotations
            .Select(a => a.Author)
            .Where(author => author != null)
            .GroupBy(author => author.Id)
            .Select(g => g.First())
            .OrderBy(a => a.Id)
            .Select(a => new ExportAuthor
            {
                Id = a.Id,
                Username = a.Username,
                Kind = a.IsSystem ? "import" : "human"
            })
            .ToList();

        var exportImages = new List<ExportImage>();
        foreach (var img in images)
        {
            var imgAnnotations = annotationsByImage[img.Id]
                .Select(a =>
                {
                    var geom = JsonSerializer.Deserialize<Geometry>(a.GeometryJson, GeometryJsonOptions)!;
                    JsonElement? prov = null;
                    if (!string.IsNullOrWhiteSpace(a.ProvenanceJson))
                    {
                        prov = JsonDocument.Parse(a.ProvenanceJson).RootElement.Clone();
                    }

                    var source = a.Source.StartsWith("import", StringComparison.OrdinalIgnoreCase)
                        ? "import"
                        : "manual";

                    return new ExportAnnotation
                    {
                        Id = a.Id,
                        ClassId = a.ClassId,
                        AuthorId = a.AuthorId,
                        Source = source,
                        CreatedAt = a.CreatedAt.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                        UpdatedAt = a.UpdatedAt.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"),
                        Geometry = geom,
                        Provenance = prov
                    };
                })
                .ToList();

            exportImages.Add(new ExportImage
            {
                Id = img.Id,
                StorageKey = img.StorageKey,
                Kind = img.Kind,
                Width = img.WidthL0,
                Height = img.HeightL0,
                MppX = img.MppX,
                MppY = img.MppY,
                Annotations = imgAnnotations
            });
        }

        var filterValue = isAll ? (object)"all" : userIds!;

        var doc = new InternalExportDocument
        {
            Format = "gia-annotations",
            FormatVersion = "1.0",
            ExportedAt = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'"),
            ExportedBy = context.ExportedByUsername,
            Filter = new ExportFilter
            {
                Authors = filterValue
            },
            CoordinateSystem = new ExportCoordinateSystem(),
            Project = new ExportNamedEntity
            {
                Id = dataset.Project.Id,
                Name = dataset.Project.Name
            },
            Dataset = new ExportNamedEntity
            {
                Id = dataset.Id,
                Name = dataset.Name
            },
            Classes = classes.Select(c => new ExportLabelClass
            {
                Id = c.Id,
                Name = c.Name,
                Color = c.Color
            }).ToList(),
            Authors = authors,
            Images = exportImages
        };

        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(doc, ExportSerializerOptions);
        var slug = ExportSlugifier.Slugify(dataset.Name, dataset.Id);
        var filename = $"{slug}-export.json";

        _logger.LogInformation("Exportado dataset {DatasetId} ({Format}) con {AnnotationsCount} anotaciones a '{Filename}'.",
            dataset.Id, FormatName, annotations.Count, filename);

        return new ExportResult("application/json", jsonBytes, filename);
    }
}
