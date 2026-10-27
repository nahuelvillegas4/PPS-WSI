namespace Pps.Domain.Tests;

using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Annotations;
using Pps.Api.Controllers.Annotations.Dtos;
using Pps.Api.Controllers.Images;
using Pps.Api.Controllers.Images.Dtos;
using Pps.Domain.Annotations;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Infrastructure.Persistence;
using Pps.Infrastructure.Storage;
using Xunit;

public class StorageAndWsiTests
{
    private sealed class FakeWsiImageInspector : IImageInspector
    {
        public Task<ImageInspectionResult> InspectAsync(string storageKey, CancellationToken cancellationToken = default)
        {
            if (storageKey.Contains("corrupt", StringComparison.OrdinalIgnoreCase))
            {
                throw new UnsupportedImageFormatException(storageKey);
            }

            if (storageKey.EndsWith(".svs", StringComparison.OrdinalIgnoreCase))
            {
                return Task.FromResult(new ImageInspectionResult(
                    StorageKey: storageKey,
                    Format: "svs",
                    Kind: "wsi",
                    Width: 46000,
                    Height: 32914,
                    LevelCount: 3,
                    MppX: 0.499,
                    MppY: 0.499,
                    FileSizeBytes: 132565343
                ));
            }

            return Task.FromResult(new ImageInspectionResult(
                StorageKey: storageKey,
                Format: "png",
                Kind: "conventional",
                Width: 1376,
                Height: 1020,
                LevelCount: 1,
                MppX: null,
                MppY: null,
                FileSizeBytes: 35839
            ));
        }
    }

    private static IFormFile CreateFormFile(string fileName, string content)
    {
        var bytes = Encoding.UTF8.GetBytes(content);
        var stream = new MemoryStream(bytes);
        return new FormFile(stream, 0, bytes.Length, "files", fileName);
    }

    private static void SetControllerUser(ControllerBase controller, long userId, string username, string role)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "Cookie");
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(identity)
        };
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
    }

    [Theory]
    [InlineData(1, "CMU-1-Small-Region.svs", "datasets/1/CMU-1-Small-Region.svs")]
    [InlineData(3, "C:\\fakepath\\CMU-1-JP2K-33005.svs", "datasets/3/CMU-1-JP2K-33005.svs")]
    [InlineData(5, "/tmp/uploads/biopsia (1).png", "datasets/5/biopsia_1.png")]
    [InlineData(2, "foto_estudio.JPG", "datasets/2/foto_estudio.jpg")]
    [InlineData(7, "placa.jpeg", "datasets/7/placa.jpeg")]
    public void BuildDatasetStorageKey_ValidSupportedFiles_ReturnsExpectedKey(
        long datasetId,
        string rawFileName,
        string expectedKey)
    {
        var key = StorageKeyValidator.BuildDatasetStorageKey(datasetId, rawFileName);
        Assert.Equal(expectedKey, key);
    }

    [Theory]
    [InlineData("documento.pdf")]
    [InlineData("malware.exe")]
    [InlineData("notas.txt")]
    [InlineData("imagen.tiff")]
    [InlineData("archivo_sin_extension")]
    public void BuildDatasetStorageKey_UnsupportedExtensions_ThrowsUnsupportedImageFormatException(string rawFileName)
    {
        Assert.Throws<UnsupportedImageFormatException>(() =>
            StorageKeyValidator.BuildDatasetStorageKey(1, rawFileName));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(".hidden.png")]
    [InlineData("..")]
    [InlineData(".")]
    public void BuildDatasetStorageKey_InvalidFileNames_ThrowsInvalidStorageKeyException(string rawFileName)
    {
        Assert.Throws<InvalidStorageKeyException>(() =>
            StorageKeyValidator.BuildDatasetStorageKey(1, rawFileName));
    }

    [Fact]
    public async Task PhysicalStorageService_SaveListAndRollbackDelete_WorksAtomically()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"gia-storage-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        try
        {
            var storage = new PhysicalStorageService(tempDir, NullLogger<PhysicalStorageService>.Instance);

            var key1 = StorageKeyValidator.BuildDatasetStorageKey(10, "slide_01.svs");
            var key2 = StorageKeyValidator.BuildDatasetStorageKey(10, "cell_02.png");

            await using (var s1 = new MemoryStream(Encoding.UTF8.GetBytes("SVS_HEADER_MOCK_DATA_12345")))
            {
                var written1 = await storage.SaveFileAsync(key1, s1);
                Assert.Equal(26, written1);
            }

            await using (var s2 = new MemoryStream(Encoding.UTF8.GetBytes("PNG_MOCK_DATA")))
            {
                var written2 = await storage.SaveFileAsync(key2, s2);
                Assert.Equal(13, written2);
            }

            Assert.True(storage.FileExists(key1));
            Assert.True(storage.FileExists(key2));

            var filesInDataset = storage.ListFiles("datasets/10/");
            Assert.Equal(2, filesInDataset.Count);
            Assert.Contains(filesInDataset, f => f.StorageKey == key1 && f.Kind == "wsi");
            Assert.Contains(filesInDataset, f => f.StorageKey == key2 && f.Kind == "conventional");

            // Rollback / delete test
            storage.DeleteFile(key1);
            Assert.False(storage.FileExists(key1));
            Assert.True(storage.FileExists(key2));
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }
    }

    [Fact]
    public void GeometryValidator_WsiLevel0Dimensions_ValidatesLargeCoordinatesAndSubpixelPrecision()
    {
        const double wsiWidth = 100000;
        const double wsiHeight = 80000;

        var validWsiRect = new RectangleGeometry
        {
            X = 84520.375,
            Y = 62140.125,
            Width = 15479.625,
            Height = 12800.5
        };

        var exRect = Record.Exception(() => GeometryValidator.ValidateAgainstImage(validWsiRect, wsiWidth, wsiHeight));
        Assert.Null(exRect);

        var validWsiPolygon = new PolygonGeometry
        {
            Points =
            [
                [45200.5, 31800.25],
                [45890.75, 31800.25],
                [45950.125, 32400.875],
                [45500.0, 32850.5],
                [45150.25, 32300.0]
            ]
        };

        var exPoly = Record.Exception(() => GeometryValidator.ValidateAgainstImage(validWsiPolygon, 46000, 32914));
        Assert.Null(exPoly);

        var outOfBoundsPoly = new PolygonGeometry
        {
            Points =
            [
                [45900.0, 32800.0],
                [46000.5, 32800.0],
                [45950.0, 32910.0]
            ]
        };

        Assert.Throws<GeometryOutOfBoundsException>(() =>
            GeometryValidator.ValidateAgainstImage(outOfBoundsPoly, 46000, 32914));
    }

    [Fact]
    public async Task UploadImages_SingleAndMultiplePhotos_RegistersInDatasetAndSupportsAtomicRollback()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), $"gia-upload-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        try
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlite(connection)
                .Options;

            await using var db = new AppDbContext(options);
            await db.Database.EnsureCreatedAsync();

            var project = new Project { Name = "Proyecto Histopatología", CreatedAt = DateTime.UtcNow };
            db.Projects.Add(project);
            await db.SaveChangesAsync();

            var dataset1 = new Dataset { ProjectId = project.Id, Name = "Dataset Biopsias 1", CreatedAt = DateTime.UtcNow };
            var dataset2 = new Dataset { ProjectId = project.Id, Name = "Dataset Control 2", CreatedAt = DateTime.UtcNow };
            db.Datasets.AddRange(dataset1, dataset2);
            await db.SaveChangesAsync();

            var storage = new PhysicalStorageService(tempDir, NullLogger<PhysicalStorageService>.Instance);
            var inspector = new FakeWsiImageInspector();
            var controller = new ImagesController(db, storage, inspector, NullLogger<ImagesController>.Instance);
            SetControllerUser(controller, userId: 2, username: "annotator1", role: "annotator");

            // 1. Subir una única imagen WSI (.svs) al dataset 1
            var singleUpload = new List<IFormFile>
            {
                CreateFormFile("CMU-1-JP2K-33005.svs", "FAKE_SVS_BINARY_STREAM")
            };

            var resSingle = await controller.UploadImages(dataset1.Id, singleUpload, CancellationToken.None);
            var objectRes1 = Assert.IsType<ObjectResult>(resSingle.Result);
            Assert.Equal(StatusCodes.Status201Created, objectRes1.StatusCode);
            var body1 = Assert.IsType<RegisterImagesResponse>(objectRes1.Value);
            Assert.Single(body1.Items);
            Assert.Equal(dataset1.Id, body1.Items[0].DatasetId);
            Assert.Equal("datasets/1/CMU-1-JP2K-33005.svs", body1.Items[0].StorageKey);
            Assert.Equal("wsi", body1.Items[0].Kind);
            Assert.Equal(46000, body1.Items[0].Width);
            Assert.Equal(32914, body1.Items[0].Height);

            // 2. Subir múltiples imágenes simultáneamente al dataset 1
            var multiUpload = new List<IFormFile>
            {
                CreateFormFile("muestra_a.png", "PNG_A_CONTENT"),
                CreateFormFile("muestra_b.svs", "SVS_B_CONTENT")
            };

            var resMulti = await controller.UploadImages(dataset1.Id, multiUpload, CancellationToken.None);
            var objectRes2 = Assert.IsType<ObjectResult>(resMulti.Result);
            Assert.Equal(StatusCodes.Status201Created, objectRes2.StatusCode);
            var body2 = Assert.IsType<RegisterImagesResponse>(objectRes2.Value);
            Assert.Equal(2, body2.Items.Count);

            // 3. Consultar las imágenes del dataset 1 -> deben aparecer las 3 registradas en este dataset
            var listRes1 = await controller.ListImages(dataset1.Id);
            var okList1 = Assert.IsType<OkObjectResult>(listRes1.Result);
            var page1 = Assert.IsType<ImagePageResponse>(okList1.Value);
            Assert.Equal(3, page1.Total);
            Assert.All(page1.Items, img => Assert.Equal(dataset1.Id, img.DatasetId));

            // Consultar el dataset 2 -> debe estar vacío (aislamiento por dataset)
            var listRes2 = await controller.ListImages(dataset2.Id);
            var okList2 = Assert.IsType<OkObjectResult>(listRes2.Result);
            var page2 = Assert.IsType<ImagePageResponse>(okList2.Value);
            Assert.Equal(0, page2.Total);

            // 4. Intentar subir una imagen ya existente en el dataset 1 -> 409 Conflict (already-registered)
            var duplicateUpload = new List<IFormFile>
            {
                CreateFormFile("muestra_a.png", "PNG_A_DUPLICATE")
            };
            var conflictEx = await Assert.ThrowsAsync<ConflictProblemException>(() =>
                controller.UploadImages(dataset1.Id, duplicateUpload, CancellationToken.None));
            Assert.Equal("urn:gia:problem:already-registered", conflictEx.ProblemType);

            // 5. Atomicidad y rollback físico: si la 2da foto de un lote falla la inspección, la 1ra se borra del disco y no se guarda en BD
            var failingBatch = new List<IFormFile>
            {
                CreateFormFile("buena_temp.png", "PNG_VALID"),
                CreateFormFile("corrupt_slide.svs", "CORRUPT_SVS")
            };
            await Assert.ThrowsAsync<UnsupportedImageFormatException>(() =>
                controller.UploadImages(dataset1.Id, failingBatch, CancellationToken.None));

            Assert.False(storage.FileExists($"datasets/{dataset1.Id}/buena_temp.png"));
            Assert.False(storage.FileExists($"datasets/{dataset1.Id}/corrupt_slide.svs"));
            Assert.Equal(3, await db.Images.CountAsync(i => i.DatasetId == dataset1.Id));
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }
    }

    [Fact]
    public async Task Annotations_MultiReviewerIsolationAndWsiLevel0_Enforces403OnForeignAnnotations()
    {
        await using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var admin = new User
        {
            Username = "admin",
            PasswordHash = "hash1",
            Role = "admin",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        var annotator = new User
        {
            Username = "revisor_patologo",
            PasswordHash = "hash2",
            Role = "annotator",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        db.Users.AddRange(admin, annotator);

        var project = new Project { Name = "WSI Patología", CreatedAt = DateTime.UtcNow };
        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "SVS Nivel 0", CreatedAt = DateTime.UtcNow };
        db.Datasets.Add(dataset);
        await db.SaveChangesAsync();

        var labelClass = new LabelClass
        {
            DatasetId = dataset.Id,
            Name = "Mitosis Atípica",
            Color = "#E63946",
            DisplayOrder = 1
        };
        db.LabelClasses.Add(labelClass);

        var wsiImage = new MedicalImage
        {
            DatasetId = dataset.Id,
            StorageKey = "datasets/1/CMU-1-JP2K-33005.svs",
            OriginalFilename = "CMU-1-JP2K-33005.svs",
            Kind = "wsi",
            Format = "svs",
            WidthL0 = 46000,
            HeightL0 = 32914,
            LevelCount = 3,
            MppX = 0.499,
            MppY = 0.499,
            CreatedAt = DateTime.UtcNow
        };
        db.Images.Add(wsiImage);
        await db.SaveChangesAsync();

        var controller = new AnnotationsController(db, NullLogger<AnnotationsController>.Instance);

        // 1. Annotator crea un polígono en coordenadas Nivel 0 de la WSI (x > 40.000 px)
        SetControllerUser(controller, annotator.Id, annotator.Username, annotator.Role);
        var createAnnotatorRes = await controller.CreateAnnotation(
            wsiImage.Id,
            new CreateAnnotationRequest
            {
                ClassId = labelClass.Id,
                Geometry = new PolygonGeometry
                {
                    Points =
                    [
                        [41200.5, 29100.25],
                        [41450.75, 29100.25],
                        [41500.0, 29350.5],
                        [41180.25, 29300.0]
                    ]
                }
            },
            CancellationToken.None);

        var created1 = Assert.IsType<CreatedResult>(createAnnotatorRes.Result);
        var annotatorAnn = Assert.IsType<AnnotationResponse>(created1.Value);
        Assert.Equal(annotator.Id, annotatorAnn.AuthorId);

        // 2. Admin crea un rectángulo en su propio conjunto sobre la misma WSI
        SetControllerUser(controller, admin.Id, admin.Username, admin.Role);
        var createAdminRes = await controller.CreateAnnotation(
            wsiImage.Id,
            new CreateAnnotationRequest
            {
                ClassId = labelClass.Id,
                Geometry = new RectangleGeometry
                {
                    X = 12500.0,
                    Y = 18400.0,
                    Width = 850.5,
                    Height = 620.25
                }
            },
            CancellationToken.None);

        var created2 = Assert.IsType<CreatedResult>(createAdminRes.Result);
        var adminAnn = Assert.IsType<AnnotationResponse>(created2.Value);
        Assert.Equal(admin.Id, adminAnn.AuthorId);

        // 3. Aislamiento de conjuntos por autor: author=me para Admin devuelve solo 1; author=all devuelve las 2
        var listMeRes = await controller.ListAnnotations(wsiImage.Id, author: "me");
        var okMe = Assert.IsType<OkObjectResult>(listMeRes.Result);
        var meItems = Assert.IsType<AnnotationListResponse>(okMe.Value).Items;
        Assert.Single(meItems);
        Assert.Equal(admin.Id, meItems[0].AuthorId);

        var listAllRes = await controller.ListAnnotations(wsiImage.Id, author: "all");
        var okAll = Assert.IsType<OkObjectResult>(listAllRes.Result);
        var allItems = Assert.IsType<AnnotationListResponse>(okAll.Value).Items;
        Assert.Equal(2, allItems.Count);

        // 4. Ni siquiera el Admin puede editar o borrar la anotación del Annotator (403 Forbidden, ADR-07)
        controller.HttpContext.Request.Headers.IfMatch = $"\"{annotatorAnn.Version}\"";
        var forbiddenUpdate = await Assert.ThrowsAsync<ForbiddenProblemException>(() =>
            controller.UpdateAnnotation(
                annotatorAnn.Id,
                new UpdateAnnotationRequest
                {
                    Geometry = new RectangleGeometry { X = 100, Y = 100, Width = 50, Height = 50 }
                },
                CancellationToken.None));
        Assert.Equal("urn:gia:problem:forbidden", forbiddenUpdate.ProblemType);

        var forbiddenDelete = await Assert.ThrowsAsync<ForbiddenProblemException>(() =>
            controller.DeleteAnnotation(annotatorAnn.Id, CancellationToken.None));
        Assert.Equal("urn:gia:problem:forbidden", forbiddenDelete.ProblemType);
    }
}
