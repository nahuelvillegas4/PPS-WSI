namespace Pps.Infrastructure.Import;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pps.Domain.Annotations;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Domain.Import;
using Pps.Infrastructure.Persistence;

public class CricImporter : IAnnotationImporter
{
    private static readonly Dictionary<string, string> BethesdaDefaultColors = new(StringComparer.OrdinalIgnoreCase)
    {
        { "NILM", "#2ca02c" },
        { "ASC-US", "#bcbd22" },
        { "LSIL", "#ff7f0e" },
        { "ASC-H", "#e377c2" },
        { "HSIL", "#d62728" },
        { "SCC", "#7f0000" }
    };

    private readonly AppDbContext _db;
    private readonly IStorageService _storage;
    private readonly IImageInspector _inspector;
    private readonly ILogger<CricImporter> _logger;

    public string Format => "cric";

    public CricImporter(
        AppDbContext db,
        IStorageService storage,
        IImageInspector inspector,
        ILogger<CricImporter> logger)
    {
        _db = db;
        _storage = storage;
        _inspector = inspector;
        _logger = logger;
    }

    public async Task<ImportReport> ImportAsync(
        long datasetId,
        long currentUserId,
        ImportRequest request,
        CancellationToken cancellationToken = default)
    {
        // 1. Validar existencia del dataset
        var dataset = await _db.Datasets
            .FirstOrDefaultAsync(d => d.Id == datasetId, cancellationToken);
        if (dataset == null)
        {
            throw new KeyNotFoundException($"No se encontró el dataset con ID {datasetId}.");
        }

        // 2. Validar sintaxis y seguridad de la clave de almacenamiento (Path Traversal)
        var normalizedSource = request.Source.Trim().Replace('\\', '/');
        StorageKeyValidator.Validate(normalizedSource);

        // 3. Control de re-importación: responder 409 already-imported si ya fue importado en este dataset (ADR-09)
        var alreadyImported = await _db.Imports
            .AnyAsync(i => i.DatasetId == datasetId && i.Source == normalizedSource, cancellationToken);
        if (alreadyImported)
        {
            throw new AlreadyImportedException(normalizedSource);
        }

        // 4. Explorar archivos en la carpeta de origen del volumen
        var storageFiles = _storage.ListFiles(normalizedSource);
        if (storageFiles.Count == 0)
        {
            throw new InvalidStorageKeyException(
                $"No se encontraron archivos en la carpeta de almacenamiento '{normalizedSource}'.");
        }

        // Buscar archivo de anotaciones (.csv o .json)
        var annotationFile = storageFiles.FirstOrDefault(f =>
            f.StorageKey.EndsWith(".csv", StringComparison.OrdinalIgnoreCase) ||
            f.StorageKey.EndsWith(".json", StringComparison.OrdinalIgnoreCase));

        if (annotationFile == null)
        {
            throw new ImportValidationException(
                $"No se encontró ningún archivo de anotaciones (.csv o .json) en '{normalizedSource}'.");
        }

        var fullPath = _storage.GetFullPath(annotationFile.StorageKey);
        if (!File.Exists(fullPath))
        {
            throw new InvalidStorageKeyException($"El archivo '{annotationFile.StorageKey}' no existe físicamente en el volumen.");
        }

        string fileContent = await File.ReadAllTextAsync(fullPath, cancellationToken);
        var parsedRecords = CricAnnotationsParser.Parse(fileContent, annotationFile.StorageKey);

        if (parsedRecords.Count == 0)
        {
            throw new ImportValidationException($"El archivo de anotaciones '{annotationFile.StorageKey}' no contiene registros válidos.");
        }

        // 5. Agrupar por imagen y validar límite de 2.000 imágenes (ADR-09, HTTP 422 import-too-large)
        var recordsByImage = parsedRecords.GroupBy(r => r.ImageRef).ToList();
        if (recordsByImage.Count > 2000)
        {
            throw new ImportTooLargeException(recordsByImage.Count, 2000);
        }

        double boxSize = request.Options?.BoxSize ?? CricPointToBoxConverter.DefaultBoxSize;
        var warnings = new List<ImportWarning>();

        // 6. Resolver usuario sintético 'import-cric' (ADR-07, ADR-09)
        var syntheticUser = await _db.Users.FirstOrDefaultAsync(u => u.Username == "import-cric", cancellationToken);
        bool needCreateSyntheticUser = false;
        if (syntheticUser == null)
        {
            syntheticUser = new User
            {
                Username = "import-cric",
                PasswordHash = "system-no-login-hash",
                Role = "annotator",
                IsActive = true,
                IsSystem = true,
                CreatedAt = DateTime.UtcNow
            };
            needCreateSyntheticUser = true;
        }

        // 7. Resolver clases de etiquetado (matched vs created)
        var existingClasses = await _db.LabelClasses
            .Where(c => c.DatasetId == datasetId)
            .ToListAsync(cancellationToken);

        var classMap = existingClasses.ToDictionary(c => c.Name, StringComparer.OrdinalIgnoreCase);
        int classesMatched = 0;
        int classesCreated = 0;
        int nextDisplayOrder = existingClasses.Count > 0 ? existingClasses.Max(c => c.DisplayOrder) + 1 : 0;
        var newClassesToInsert = new List<LabelClass>();

        var distinctClassNames = parsedRecords.Select(r => r.ClassName).Distinct(StringComparer.OrdinalIgnoreCase);
        foreach (var className in distinctClassNames)
        {
            if (classMap.TryGetValue(className, out var existing))
            {
                classesMatched++;
            }
            else
            {
                classesCreated++;
                string color = BethesdaDefaultColors.TryGetValue(className, out var defColor) ? defColor : "#1f77b4";
                var newClass = new LabelClass
                {
                    DatasetId = datasetId,
                    Name = className,
                    Color = color,
                    DisplayOrder = nextDisplayOrder++
                };
                classMap[className] = newClass;
                newClassesToInsert.Add(newClass);
            }
        }

        // 8. Resolver imágenes (found, registered, skipped)
        var existingImages = await _db.Images
            .Where(i => i.DatasetId == datasetId)
            .ToListAsync(cancellationToken);

        var existingImagesByStorageKey = existingImages.ToDictionary(i => i.StorageKey, StringComparer.OrdinalIgnoreCase);
        var existingImagesByFilename = existingImages.ToDictionary(i => Path.GetFileName(i.StorageKey), StringComparer.OrdinalIgnoreCase);

        int imagesFound = recordsByImage.Count;
        int imagesRegistered = 0;
        int imagesSkipped = 0;
        var newImagesToInsert = new List<MedicalImage>();
        var imageLookup = new Dictionary<string, MedicalImage>(StringComparer.OrdinalIgnoreCase);

        foreach (var group in recordsByImage)
        {
            string imgRef = group.Key;
            MedicalImage? targetImage = null;

            // Buscar si ya está registrada por clave completa o por nombre de archivo
            if (existingImagesByStorageKey.TryGetValue(imgRef, out var byKey))
            {
                targetImage = byKey;
            }
            else if (existingImagesByFilename.TryGetValue(Path.GetFileName(imgRef), out var byFile))
            {
                targetImage = byFile;
            }

            if (targetImage != null)
            {
                imagesSkipped++;
                warnings.Add(new ImportWarning
                {
                    Code = "image-already-registered",
                    Message = $"La imagen '{targetImage.StorageKey}' ya está registrada en el dataset.",
                    Record = targetImage.StorageKey
                });
                imageLookup[imgRef] = targetImage;
            }
            else
            {
                // Determinar la clave de almacenamiento en el volumen
                string candidateKey = imgRef.Contains('/')
                    ? imgRef
                    : $"{normalizedSource.TrimEnd('/')}/{imgRef}";

                // Si no coincide exactamente, buscar en los archivos del volumen
                var matchingFile = storageFiles.FirstOrDefault(f =>
                    string.Equals(f.StorageKey, candidateKey, StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(Path.GetFileName(f.StorageKey), Path.GetFileName(imgRef), StringComparison.OrdinalIgnoreCase));

                string finalKey = matchingFile?.StorageKey ?? candidateKey;

                // Inspeccionar imagen para obtener dimensiones y niveles
                ImageInspectionResult inspection;
                try
                {
                    inspection = await _inspector.InspectAsync(finalKey, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "No se pudo inspeccionar la imagen '{Key}'.", finalKey);
                    warnings.Add(new ImportWarning
                    {
                        Code = "image-inspection-failed",
                        Message = $"Fallo al inspeccionar la imagen '{finalKey}': {ex.Message}",
                        Record = finalKey
                    });
                    continue;
                }

                imagesRegistered++;
                var newImage = new MedicalImage
                {
                    DatasetId = datasetId,
                    StorageKey = finalKey,
                    OriginalFilename = Path.GetFileName(finalKey),
                    Format = inspection.Format,
                    Kind = inspection.Kind,
                    WidthL0 = inspection.Width,
                    HeightL0 = inspection.Height,
                    LevelCount = inspection.LevelCount,
                    MppX = inspection.MppX,
                    MppY = inspection.MppY,
                    CreatedAt = DateTime.UtcNow
                };

                newImagesToInsert.Add(newImage);
                imageLookup[imgRef] = newImage;
            }
        }

        // 9. Procesar y convertir anotaciones con CricPointToBoxConverter
        int annotationsCreated = 0;
        int annotationsSkipped = 0;
        var annotationsToInsert = new List<Annotation>();

        foreach (var group in recordsByImage)
        {
            if (!imageLookup.TryGetValue(group.Key, out var img))
            {
                annotationsSkipped += group.Count();
                continue;
            }

            foreach (var record in group)
            {
                if (!classMap.TryGetValue(record.ClassName, out var labelClass))
                {
                    annotationsSkipped++;
                    warnings.Add(new ImportWarning
                    {
                        Code = "class-not-found",
                        Message = $"No se encontró la clase '{record.ClassName}'.",
                        Record = $"cellId: {record.CellId}"
                    });
                    continue;
                }

                var boxResult = CricPointToBoxConverter.Convert(
                    nucleusX: record.NucleusX,
                    nucleusY: record.NucleusY,
                    boxSize: boxSize,
                    imageWidth: img.WidthL0,
                    imageHeight: img.HeightL0
                );

                if (!boxResult.IsValid)
                {
                    annotationsSkipped++;
                    warnings.Add(new ImportWarning
                    {
                        Code = "point-out-of-bounds",
                        Message = $"El punto celular ({record.NucleusX}, {record.NucleusY}) está fuera de la imagen ({img.WidthL0}x{img.HeightL0} px).",
                        Record = $"cellId: {record.CellId}"
                    });
                    continue;
                }

                if (boxResult.Clipped)
                {
                    warnings.Add(new ImportWarning
                    {
                        Code = "box-clipped",
                        Message = $"Caja recortada a los bordes de la imagen ({boxResult.Geometry.Width:F0}x{boxResult.Geometry.Height:F0} px).",
                        Record = $"cellId: {record.CellId}"
                    });
                }

                var provenance = new CricProvenance
                {
                    ImportId = null, // Se asigna al persistir
                    Format = "cric",
                    Conversion = "point-to-box",
                    Nucleus = [record.NucleusX, record.NucleusY],
                    BoxSize = boxSize,
                    SourceRecord = new { cellId = record.CellId }
                };

                var annotation = new Annotation
                {
                    DatasetId = datasetId,
                    Image = img,
                    Class = labelClass,
                    Author = syntheticUser,
                    GeometryJson = JsonSerializer.Serialize<Geometry>(boxResult.Geometry),
                    BboxMinX = boxResult.Geometry.X ?? 0,
                    BboxMinY = boxResult.Geometry.Y ?? 0,
                    BboxMaxX = (boxResult.Geometry.X ?? 0) + (boxResult.Geometry.Width ?? 0),
                    BboxMaxY = (boxResult.Geometry.Y ?? 0) + (boxResult.Geometry.Height ?? 0),
                    Area = (boxResult.Geometry.Width ?? 0) * (boxResult.Geometry.Height ?? 0),
                    Source = "import",
                    ProvenanceJson = JsonSerializer.Serialize(provenance),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                annotationsToInsert.Add(annotation);
                annotationsCreated++;
            }
        }

        // 10. Construcción del reporte contractual
        var report = new ImportReport
        {
            ImportId = null,
            DryRun = request.DryRun,
            Format = "cric",
            Source = normalizedSource,
            Images = new ImageCounts
            {
                Found = imagesFound,
                Registered = imagesRegistered,
                Skipped = imagesSkipped
            },
            Classes = new ClassCounts
            {
                Matched = classesMatched,
                Created = classesCreated
            },
            Annotations = new AnnotationCounts
            {
                Created = annotationsCreated,
                Skipped = annotationsSkipped
            },
            Warnings = warnings
        };

        // 11. Ejecución atómica o simulación
        if (request.DryRun)
        {
            _logger.LogInformation("Simulación dryRun de importación CRIC completada: {Images} imágenes, {Ann} anotaciones.", imagesFound, annotationsCreated);
            return report;
        }

        // Ejecución transaccional atómica (ADR-09)
        var strategy = _db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(cancellationToken);
            try
            {
                if (needCreateSyntheticUser)
                {
                    _db.Users.Add(syntheticUser);
                    await _db.SaveChangesAsync(cancellationToken);
                }

                if (newClassesToInsert.Count > 0)
                {
                    _db.LabelClasses.AddRange(newClassesToInsert);
                    await _db.SaveChangesAsync(cancellationToken);
                }

                if (newImagesToInsert.Count > 0)
                {
                    _db.Images.AddRange(newImagesToInsert);
                    await _db.SaveChangesAsync(cancellationToken);
                }

                var importRecord = new ImportRecord
                {
                    DatasetId = datasetId,
                    Format = "cric",
                    Source = normalizedSource,
                    ImportedAt = DateTime.UtcNow,
                    ImportedById = currentUserId,
                    ImagesFound = imagesFound,
                    ImagesRegistered = imagesRegistered,
                    ImagesSkipped = imagesSkipped,
                    ClassesMatched = classesMatched,
                    ClassesCreated = classesCreated,
                    AnnotationsCreated = annotationsCreated,
                    AnnotationsSkipped = annotationsSkipped,
                    ReportJson = JsonSerializer.Serialize(report)
                };

                _db.Imports.Add(importRecord);
                await _db.SaveChangesAsync(cancellationToken);

                // Asignar claves foráneas e importId en la procedencia de cada anotación
                foreach (var ann in annotationsToInsert)
                {
                    ann.ImageId = ann.Image.Id;
                    ann.ClassId = ann.Class.Id;
                    ann.AuthorId = syntheticUser.Id;

                    if (!string.IsNullOrEmpty(ann.ProvenanceJson))
                    {
                        var prov = JsonSerializer.Deserialize<CricProvenance>(ann.ProvenanceJson);
                        if (prov != null)
                        {
                            prov.ImportId = importRecord.Id;
                            ann.ProvenanceJson = JsonSerializer.Serialize(prov);
                        }
                    }
                }

                _db.Annotations.AddRange(annotationsToInsert);
                await _db.SaveChangesAsync(cancellationToken);

                await tx.CommitAsync(cancellationToken);

                report.ImportId = importRecord.Id;
                _logger.LogInformation("Importación CRIC persistida con éxito: Import ID {ImportId}, {Ann} anotaciones.", importRecord.Id, annotationsCreated);
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync(cancellationToken);
                _logger.LogError(ex, "Error durante la importación atómica de CRIC.");
                throw;
            }
        });

        return report;
    }
}
