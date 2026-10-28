namespace Pps.Domain.Tests;

using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.IO;
using Pps.Domain.Annotations;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Export;
using Pps.Domain.Export.Coco;
using Pps.Domain.Export.Internal;
using Pps.Domain.Images;
using Pps.Infrastructure.Export;
using Pps.Infrastructure.Persistence;
using Xunit;

public class CocoExportTests
{
    private static string FindRepoRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            if (File.Exists(Path.Combine(current.FullName, "contract", "fixtures", "export.json")))
            {
                return current.FullName;
            }
            current = current.Parent;
        }

        throw new FileNotFoundException("No se encontró la raíz del repositorio.");
    }

    [Fact]
    public void CocoGeometryConverter_Rectangle_MatchesContractFixture()
    {
        // Caso contractual: Rectángulo (600, 390, 100, 100), clase HSIL (15)
        var rect = new RectangleGeometry
        {
            X = 600,
            Y = 390,
            Width = 100,
            Height = 100
        };

        var result = CocoGeometryConverter.Convert(rect);

        // Bbox: [x, y, width, height]
        Assert.Equal(new double[] { 600, 390, 100, 100 }, result.Bbox);
        // Area: width * height
        Assert.Equal(10000.0, result.Area);
        // Segmentation: [[600, 390, 700, 390, 700, 490, 600, 490]]
        Assert.Single(result.Segmentation);
        Assert.Equal(new double[] { 600, 390, 700, 390, 700, 490, 600, 490 }, result.Segmentation[0]);
    }

    [Fact]
    public void CocoGeometryConverter_Polygon_MatchesContractFixture()
    {
        // Caso contractual: Polígono (10, 10), (110, 10), (60, 90), clase LSIL (13)
        var poly = new PolygonGeometry
        {
            Points = new double[][]
            {
                new double[] { 10, 10 },
                new double[] { 110, 10 },
                new double[] { 60, 90 }
            }
        };

        var result = CocoGeometryConverter.Convert(poly);

        // Bbox: [minX, minY, width, height] = [10, 10, 100, 80]
        Assert.Equal(new double[] { 10, 10, 100, 80 }, result.Bbox);
        // Area: 4000
        Assert.Equal(4000.0, result.Area);
        // Segmentation: [[10, 10, 110, 10, 60, 90]]
        Assert.Single(result.Segmentation);
        Assert.Equal(new double[] { 10, 10, 110, 10, 60, 90 }, result.Segmentation[0]);
    }

    [Fact]
    public void CocoGeometryConverter_WsiRectangle_MatchesContractFixture()
    {
        // Caso contractual: Rectángulo (32000, 21500, 500, 400) en una WSI de 100000 x 80000
        var wsiRect = new RectangleGeometry
        {
            X = 32000,
            Y = 21500,
            Width = 500,
            Height = 400
        };

        var result = CocoGeometryConverter.Convert(wsiRect);

        Assert.Equal(new double[] { 32000, 21500, 500, 400 }, result.Bbox);
        Assert.Equal(200000.0, result.Area);
        Assert.Single(result.Segmentation);
        Assert.Equal(new double[] { 32000, 21500, 32500, 21500, 32500, 21900, 32000, 21900 }, result.Segmentation[0]);
    }

    [Fact]
    public void CocoGeometryConverter_ContractFixtureFile_MatchesAllCasesDirectly()
    {
        var repoRoot = FindRepoRoot();
        var fixturePath = Path.Combine(repoRoot, "contract", "fixtures", "export.json");
        var jsonText = File.ReadAllText(fixturePath);
        using var doc = JsonDocument.Parse(jsonText);

        var annotations = doc.RootElement.GetProperty("annotations");
        foreach (var annot in annotations.EnumerateArray())
        {
            var geomElem = annot.GetProperty("geometry");
            var cocoElem = annot.GetProperty("coco");

            Geometry geom;
            var type = geomElem.GetProperty("type").GetString();
            if (type == "rectangle")
            {
                geom = new RectangleGeometry
                {
                    X = geomElem.GetProperty("x").GetDouble(),
                    Y = geomElem.GetProperty("y").GetDouble(),
                    Width = geomElem.GetProperty("width").GetDouble(),
                    Height = geomElem.GetProperty("height").GetDouble()
                };
            }
            else
            {
                var ptsElem = geomElem.GetProperty("points");
                var pointsList = new List<double[]>();
                foreach (var p in ptsElem.EnumerateArray())
                {
                    pointsList.Add(new double[] { p[0].GetDouble(), p[1].GetDouble() });
                }
                geom = new PolygonGeometry { Points = pointsList.ToArray() };
            }

            var converted = CocoGeometryConverter.Convert(geom);

            // Bbox
            var expectedBbox = cocoElem.GetProperty("bbox").EnumerateArray().Select(e => e.GetDouble()).ToArray();
            Assert.Equal(expectedBbox, converted.Bbox);

            // Area
            var expectedArea = cocoElem.GetProperty("area").GetDouble();
            Assert.Equal(expectedArea, converted.Area, precision: 5);

            // Segmentation
            var expectedSegArray = cocoElem.GetProperty("segmentation")[0].EnumerateArray().Select(e => e.GetDouble()).ToArray();
            Assert.Single(converted.Segmentation);
            Assert.Equal(expectedSegArray, converted.Segmentation[0]);
        }

        // Wsi fixture check
        var wsiElem = doc.RootElement.GetProperty("wsi");
        var wsiAnnot = wsiElem.GetProperty("annotation");
        var wsiCoco = wsiElem.GetProperty("coco");

        var wsiGeom = new RectangleGeometry
        {
            X = wsiAnnot.GetProperty("x").GetDouble(),
            Y = wsiAnnot.GetProperty("y").GetDouble(),
            Width = wsiAnnot.GetProperty("width").GetDouble(),
            Height = wsiAnnot.GetProperty("height").GetDouble()
        };

        var wsiConverted = CocoGeometryConverter.Convert(wsiGeom);
        var wsiExpectedBbox = wsiCoco.GetProperty("bbox").EnumerateArray().Select(e => e.GetDouble()).ToArray();
        Assert.Equal(wsiExpectedBbox, wsiConverted.Bbox);
        Assert.Equal(wsiCoco.GetProperty("area").GetDouble(), wsiConverted.Area, precision: 5);
        var wsiExpectedSeg = wsiCoco.GetProperty("segmentation")[0].EnumerateArray().Select(e => e.GetDouble()).ToArray();
        Assert.Equal(wsiExpectedSeg, wsiConverted.Segmentation[0]);
    }

    [Fact]
    public async Task CocoExporter_FullDatasetExport_GeneratesValidCocoJsonAndRespectsFilters()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();

        // 1. Seed data
        var user1 = new User { Username = "nahuel", PasswordHash = "hash1", Role = "admin", IsActive = true };
        var user2 = new User { Username = "gino", PasswordHash = "hash2", Role = "annotator", IsActive = true };
        db.Users.AddRange(user1, user2);
        await db.SaveChangesAsync();

        var project = new Project { Name = "Citología cervical", Description = "Proyecto prueba" };
        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "CRIC · subconjunto de prueba" };
        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();

        var class1 = new LabelClass { DatasetId = dataset.Id, Name = "NILM", Color = "#2ca02c", DisplayOrder = 0 };
        var class2 = new LabelClass { DatasetId = dataset.Id, Name = "HSIL", Color = "#d62728", DisplayOrder = 1 };
        db.LabelClasses.AddRange(class1, class2);
        await db.SaveChangesAsync();

        var img1 = new MedicalImage
        {
            DatasetId = dataset.Id,
            StorageKey = "cric/0001.png",
            OriginalFilename = "0001.png",
            Kind = "conventional",
            Format = "png",
            WidthL0 = 1376,
            HeightL0 = 1020,
            LevelCount = 1
        };
        var img2 = new MedicalImage
        {
            DatasetId = dataset.Id,
            StorageKey = "wsi/CMU-1.svs",
            OriginalFilename = "CMU-1.svs",
            Kind = "wsi",
            Format = "svs",
            WidthL0 = 100000,
            HeightL0 = 80000,
            LevelCount = 3,
            MppX = 0.25,
            MppY = 0.25
        };
        db.Images.AddRange(img1, img2);
        await db.SaveChangesAsync();

        var annot1 = new Annotation
        {
            DatasetId = dataset.Id,
            ImageId = img1.Id,
            ClassId = class2.Id,
            AuthorId = user1.Id,
            GeometryJson = "{\"type\":\"rectangle\",\"x\":600,\"y\":390,\"width\":100,\"height\":100}",
            BboxMinX = 600,
            BboxMinY = 390,
            BboxMaxX = 700,
            BboxMaxY = 490,
            Area = 10000,
            Source = "manual"
        };
        var annot2 = new Annotation
        {
            DatasetId = dataset.Id,
            ImageId = img1.Id,
            ClassId = class1.Id,
            AuthorId = user2.Id,
            GeometryJson = "{\"type\":\"polygon\",\"points\":[[10,10],[110,10],[60,90]]}",
            BboxMinX = 10,
            BboxMinY = 10,
            BboxMaxX = 110,
            BboxMaxY = 90,
            Area = 4000,
            Source = "manual"
        };
        var annotWsi = new Annotation
        {
            DatasetId = dataset.Id,
            ImageId = img2.Id,
            ClassId = class2.Id,
            AuthorId = user1.Id,
            GeometryJson = "{\"type\":\"rectangle\",\"x\":32000,\"y\":21500,\"width\":500,\"height\":400}",
            BboxMinX = 32000,
            BboxMinY = 21500,
            BboxMaxX = 32500,
            BboxMaxY = 21900,
            Area = 200000,
            Source = "manual"
        };
        var annotDeleted = new Annotation
        {
            DatasetId = dataset.Id,
            ImageId = img1.Id,
            ClassId = class1.Id,
            AuthorId = user1.Id,
            GeometryJson = "{\"type\":\"rectangle\",\"x\":10,\"y\":10,\"width\":20,\"height\":20}",
            BboxMinX = 10,
            BboxMinY = 10,
            BboxMaxX = 30,
            BboxMaxY = 30,
            Area = 400,
            Source = "manual",
            DeletedAt = DateTime.UtcNow
        };
        db.Annotations.AddRange(annot1, annot2, annotWsi, annotDeleted);
        await db.SaveChangesAsync();

        var exporter = new CocoExporter(db, NullLogger<CocoExporter>.Instance);

        // 2. Exportación global (authors=all)
        var contextAll = new ExportContext(dataset.Id, "nahuel", user1.Id, "all");
        var resultAll = await exporter.ExportDatasetAsync(contextAll);

        Assert.Equal("application/json", resultAll.ContentType);
        Assert.Equal("cric-subconjunto-de-prueba-coco.json", resultAll.Filename);

        using var cocoDocAll = JsonDocument.Parse(resultAll.Data);
        var rootAll = cocoDocAll.RootElement;

        // Info
        Assert.True(rootAll.TryGetProperty("info", out var infoProp));
        Assert.Equal("CRIC · subconjunto de prueba", infoProp.GetProperty("description").GetString());
        Assert.Equal("1.0", infoProp.GetProperty("version").GetString());
        Assert.Equal("nahuel", infoProp.GetProperty("contributor").GetString());

        // Licenses
        Assert.True(rootAll.TryGetProperty("licenses", out var licProp));
        Assert.Equal(1, licProp.GetArrayLength());

        // Categories
        Assert.True(rootAll.TryGetProperty("categories", out var catProp));
        Assert.Equal(2, catProp.GetArrayLength());
        Assert.Equal(class1.Id, catProp[0].GetProperty("id").GetInt64());
        Assert.Equal("NILM", catProp[0].GetProperty("name").GetString());
        Assert.Equal("none", catProp[0].GetProperty("supercategory").GetString());

        // Images: las 2 imágenes del dataset
        Assert.True(rootAll.TryGetProperty("images", out var imagesProp));
        Assert.Equal(2, imagesProp.GetArrayLength());
        Assert.Equal(img1.Id, imagesProp[0].GetProperty("id").GetInt64());
        Assert.Equal(1376, imagesProp[0].GetProperty("width").GetInt64());
        Assert.Equal(1020, imagesProp[0].GetProperty("height").GetInt64());
        Assert.Equal("cric/0001.png", imagesProp[0].GetProperty("file_name").GetString());

        Assert.Equal(img2.Id, imagesProp[1].GetProperty("id").GetInt64());
        Assert.Equal(100000, imagesProp[1].GetProperty("width").GetInt64());
        Assert.Equal(80000, imagesProp[1].GetProperty("height").GetInt64());
        Assert.Equal("wsi/CMU-1.svs", imagesProp[1].GetProperty("file_name").GetString());

        // Annotations: exactamente 3 (la borrada fue excluida)
        Assert.True(rootAll.TryGetProperty("annotations", out var annotationsProp));
        Assert.Equal(3, annotationsProp.GetArrayLength());

        var annots = annotationsProp.EnumerateArray().ToList();
        Assert.All(annots, a =>
        {
            Assert.Equal(0, a.GetProperty("iscrowd").GetInt32());
            Assert.True(a.GetProperty("area").GetDouble() > 0);
            Assert.Equal(4, a.GetProperty("bbox").GetArrayLength());
            Assert.Equal(1, a.GetProperty("segmentation").GetArrayLength());
        });

        // 3. Exportación filtrada por autor (authors=me, para user1 nahuel)
        var contextMe = new ExportContext(dataset.Id, "nahuel", user1.Id, "me");
        var resultMe = await exporter.ExportDatasetAsync(contextMe);

        using var cocoDocMe = JsonDocument.Parse(resultMe.Data);
        var rootMe = cocoDocMe.RootElement;
        var annotationsMe = rootMe.GetProperty("annotations").EnumerateArray().ToList();

        // user1 tiene exactamente 2 anotaciones activas (annot1 y annotWsi)
        Assert.Equal(2, annotationsMe.Count);
        Assert.Contains(annotationsMe, a => a.GetProperty("id").GetInt64() == annot1.Id);
        Assert.Contains(annotationsMe, a => a.GetProperty("id").GetInt64() == annotWsi.Id);
        Assert.DoesNotContain(annotationsMe, a => a.GetProperty("id").GetInt64() == annot2.Id);

        // Las imágenes siguen estando presentes en la cabecera
        Assert.Equal(2, rootMe.GetProperty("images").GetArrayLength());
    }

    [Fact]
    public async Task CocoExporter_DatasetNotFound_ThrowsKeyNotFoundException()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var exporter = new CocoExporter(db, NullLogger<CocoExporter>.Instance);
        var context = new ExportContext(9999, "nahuel", 1, "all");

        await Assert.ThrowsAsync<KeyNotFoundException>(() => exporter.ExportDatasetAsync(context));
    }

    [Fact]
    public async Task ExportController_DispatchAndValidation_BehavesAccordingToContract()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var user = new User { Username = "nahuel", PasswordHash = "hash", Role = "admin", IsActive = true };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var project = new Project { Name = "Proyecto", Description = "Desc" };
        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "Dataset Test" };
        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();

        var internalExporter = new InternalJsonExporter(db, NullLogger<InternalJsonExporter>.Instance);
        var cocoExporter = new CocoExporter(db, NullLogger<CocoExporter>.Instance);
        var exporters = new IExporter[] { internalExporter, cocoExporter };

        var controller = new ExportController(exporters, NullLogger<ExportController>.Instance);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Role, user.Role)
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(claims, "Cookie"))
            }
        };

        // 1. format=coco -> OK FileResult con -coco.json
        var resultCoco = await controller.ExportDataset(dataset.Id, "coco", "all");
        var fileResultCoco = Assert.IsType<FileContentResult>(resultCoco);
        Assert.Equal("application/json", fileResultCoco.ContentType);
        Assert.EndsWith("-coco.json", fileResultCoco.FileDownloadName);

        // 2. format=internal -> OK FileResult con -export.json
        var resultInternal = await controller.ExportDataset(dataset.Id, "internal", "all");
        var fileResultInternal = Assert.IsType<FileContentResult>(resultInternal);
        Assert.Equal("application/json", fileResultInternal.ContentType);
        Assert.EndsWith("-export.json", fileResultInternal.FileDownloadName);

        // 3. format=yolo -> 422 Unprocessable Entity (unsupported-format)
        var yoloEx = await Assert.ThrowsAsync<UnprocessableEntityProblemException>(() =>
            controller.ExportDataset(dataset.Id, "yolo", "all"));
        Assert.Equal("urn:gia:problem:unsupported-format", yoloEx.ProblemType);

        // 4. format vacío -> 400 Validation Problem
        await Assert.ThrowsAsync<ValidationProblemException>(() =>
            controller.ExportDataset(dataset.Id, "", "all"));

        // 5. format inválido -> 400 Validation Problem
        await Assert.ThrowsAsync<ValidationProblemException>(() =>
            controller.ExportDataset(dataset.Id, "invalid-format", "all"));
    }
}
