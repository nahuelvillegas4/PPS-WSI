namespace Pps.Domain.Tests;

using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pps.Api.Controllers.IO;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Domain.Import;
using Pps.Infrastructure.Import;
using Pps.Infrastructure.Persistence;
using Xunit;

public class CricImportTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;
    private readonly FakeStorageService _storage;
    private readonly FakeImageInspector _inspector;
    private readonly CricImporter _importer;

    public CricImportTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();

        _storage = new FakeStorageService();
        _inspector = new FakeImageInspector();
        _importer = new CricImporter(
            _context,
            _storage,
            _inspector,
            NullLogger<CricImporter>.Instance);
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
    }

    private sealed class FakeStorageService : IStorageService
    {
        private readonly Dictionary<string, string> _files = new(StringComparer.OrdinalIgnoreCase);
        private readonly string _tempDir = Path.Combine(Path.GetTempPath(), "pps_cric_test_" + Guid.NewGuid().ToString("N"));

        public string BasePath => _tempDir;

        public FakeStorageService()
        {
            Directory.CreateDirectory(_tempDir);
        }

        public void AddFile(string storageKey, string content)
        {
            _files[storageKey] = content;
            var fullPath = GetFullPath(storageKey);
            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);
            File.WriteAllText(fullPath, content);
        }

        public IReadOnlyList<StorageItem> ListFiles(string? prefix = null)
        {
            var p = prefix?.Trim().Replace('\\', '/') ?? "";
            return _files.Keys
                .Where(k => string.IsNullOrEmpty(p) || k.StartsWith(p, StringComparison.OrdinalIgnoreCase))
                .Select(k => new StorageItem(k, 1024, "conventional"))
                .ToList();
        }

        public bool FileExists(string storageKey) => _files.ContainsKey(storageKey);

        public string GetFullPath(string storageKey)
        {
            return Path.Combine(_tempDir, storageKey.Replace('/', Path.DirectorySeparatorChar));
        }

        public Task<long> SaveFileAsync(string storageKey, Stream content, CancellationToken cancellationToken = default)
        {
            throw new NotImplementedException();
        }

        public void DeleteFile(string storageKey)
        {
            _files.Remove(storageKey);
            var path = GetFullPath(storageKey);
            if (File.Exists(path)) File.Delete(path);
        }
    }

    private sealed class FakeImageInspector : IImageInspector
    {
        public Task<ImageInspectionResult> InspectAsync(string storageKey, CancellationToken cancellationToken = default)
        {
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

    [Fact]
    public async Task Import_DryRunTrue_ReturnsReportWithoutModifyingDatabase()
    {
        // 1. Setup base
        var admin = new User { Username = "admin", PasswordHash = "hash", Role = "admin" };
        var project = new Project { Name = "Proyecto CRIC", Description = "Test" };
        _context.Users.Add(admin);
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "Dataset CRIC", Description = "Test" };
        _context.Datasets.Add(dataset);
        await _context.SaveChangesAsync();

        // 2. Mock archivos CRIC en storage (1 CSV con 2 registros: 1 centrado y 1 recortado)
        string csvContent = "image_filename,cell_id,nucleus_x,nucleus_y,bethesda_system\n" +
                            "0001.png,123,650,440,HSIL\n" +
                            "0001.png,124,30,1000,LSIL\n";
        _storage.AddFile("cric/classifications.csv", csvContent);
        _storage.AddFile("cric/0001.png", "dummy-image-content");

        // Contar entidades antes
        int initialAnnCount = await _context.Annotations.CountAsync();
        int initialImgCount = await _context.Images.CountAsync();
        int initialClassCount = await _context.LabelClasses.CountAsync();
        int initialImportCount = await _context.Imports.CountAsync();

        // 3. Ejecutar con dryRun = true
        var request = new ImportRequest
        {
            Format = "cric",
            Source = "cric/",
            DryRun = true,
            Options = new ImportOptions { BoxSize = 100 }
        };

        var report = await _importer.ImportAsync(dataset.Id, admin.Id, request);

        // 4. Verificaciones sobre el reporte
        Assert.Null(report.ImportId);
        Assert.True(report.DryRun);
        Assert.Equal("cric", report.Format);
        Assert.Equal("cric/", report.Source);
        Assert.Equal(1, report.Images.Found);
        Assert.Equal(1, report.Images.Registered);
        Assert.Equal(0, report.Images.Skipped);
        Assert.Equal(2, report.Classes.Created); // HSIL y LSIL creadas
        Assert.Equal(0, report.Classes.Matched);
        Assert.Equal(2, report.Annotations.Created);
        Assert.Equal(0, report.Annotations.Skipped);

        // Advertencia de caja recortada esperada para la célula 124
        Assert.Contains(report.Warnings, w => w.Code == "box-clipped" && w.Record == "cellId: 124");

        // 5. Cero escrituras en la base de datos (ADR-09)
        Assert.Equal(initialAnnCount, await _context.Annotations.CountAsync());
        Assert.Equal(initialImgCount, await _context.Images.CountAsync());
        Assert.Equal(initialClassCount, await _context.LabelClasses.CountAsync());
        Assert.Equal(initialImportCount, await _context.Imports.CountAsync());
    }

    [Fact]
    public async Task Import_DryRunFalse_PersistsAtomicallyWithSyntheticUserAndProvenance()
    {
        // 1. Setup base
        var admin = new User { Username = "admin", PasswordHash = "hash", Role = "admin" };
        var project = new Project { Name = "Proyecto CRIC Prod", Description = "Test" };
        _context.Users.Add(admin);
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "Dataset CRIC Prod", Description = "Test" };
        _context.Datasets.Add(dataset);
        await _context.SaveChangesAsync();

        // Clase preexistente: LSIL
        var preClass = new LabelClass { DatasetId = dataset.Id, Name = "LSIL", Color = "#ff7f0e", DisplayOrder = 0 };
        _context.LabelClasses.Add(preClass);
        await _context.SaveChangesAsync();

        // 2. Archivo CRIC en storage
        string jsonContent = JsonSerializer.Serialize(new[]
        {
            new { image = "cric/0001.png", cellId = "101", nucleus = new[] { 650.0, 440.0 }, classification = "HSIL" },
            new { image = "cric/0001.png", cellId = "102", nucleus = new[] { 30.0, 1000.0 }, classification = "LSIL" }
        });
        _storage.AddFile("cric/annotations.json", jsonContent);
        _storage.AddFile("cric/0001.png", "dummy-image-content");

        // 3. Ejecutar con dryRun = false
        var request = new ImportRequest
        {
            Format = "cric",
            Source = "cric/",
            DryRun = false,
            Options = new ImportOptions { BoxSize = 100 }
        };

        var report = await _importer.ImportAsync(dataset.Id, admin.Id, request);

        // 4. Verificaciones sobre el reporte persistido
        Assert.NotNull(report.ImportId);
        Assert.False(report.DryRun);
        Assert.Equal(1, report.Classes.Matched); // LSIL coincidió
        Assert.Equal(1, report.Classes.Created); // HSIL creada
        Assert.Equal(2, report.Annotations.Created);

        // 5. Verificaciones en la base de datos
        var importRecord = await _context.Imports.FindAsync(report.ImportId.Value);
        Assert.NotNull(importRecord);
        Assert.Equal(dataset.Id, importRecord.DatasetId);
        Assert.Equal("cric", importRecord.Format);
        Assert.Equal("cric/", importRecord.Source);
        Assert.Equal(admin.Id, importRecord.ImportedById);
        Assert.Equal(2, importRecord.AnnotationsCreated);

        // Usuario sintético 'import-cric' creado y con is_system = true
        var syntheticUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == "import-cric");
        Assert.NotNull(syntheticUser);
        Assert.True(syntheticUser.IsSystem);
        Assert.Equal("annotator", syntheticUser.Role);

        // Anotaciones persistidas con procedencia
        var annotations = await _context.Annotations
            .Where(a => a.DatasetId == dataset.Id)
            .ToListAsync();
        Assert.Equal(2, annotations.Count);

        foreach (var ann in annotations)
        {
            Assert.Equal(syntheticUser.Id, ann.AuthorId);
            Assert.Equal("import", ann.Source);
            Assert.NotNull(ann.ProvenanceJson);

            using var doc = JsonDocument.Parse(ann.ProvenanceJson);
            Assert.Equal(report.ImportId.Value, doc.RootElement.GetProperty("importId").GetInt64());
            Assert.Equal("cric", doc.RootElement.GetProperty("format").GetString());
            Assert.Equal("point-to-box", doc.RootElement.GetProperty("conversion").GetString());
            Assert.Equal(100, doc.RootElement.GetProperty("boxSize").GetDouble());
        }
    }

    [Fact]
    public async Task Import_ReimportSameSource_ThrowsAlreadyImportedException()
    {
        // 1. Setup base
        var admin = new User { Username = "admin", PasswordHash = "hash", Role = "admin" };
        var project = new Project { Name = "Proyecto Dup", Description = "Test" };
        _context.Users.Add(admin);
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "Dataset Dup", Description = "Test" };
        _context.Datasets.Add(dataset);
        await _context.SaveChangesAsync();

        // 2. Simular import ya realizado
        var existingImport = new ImportRecord
        {
            DatasetId = dataset.Id,
            Format = "cric",
            Source = "cric/",
            ImportedById = admin.Id,
            ReportJson = "{}"
        };
        _context.Imports.Add(existingImport);
        await _context.SaveChangesAsync();

        _storage.AddFile("cric/class.csv", "image,cell,x,y,class\n0001.png,1,100,100,NILM\n");

        var request = new ImportRequest
        {
            Format = "cric",
            Source = "cric/",
            DryRun = false
        };

        // 3. Debe arrojar AlreadyImportedException (409)
        var ex = await Assert.ThrowsAsync<AlreadyImportedException>(() =>
            _importer.ImportAsync(dataset.Id, admin.Id, request));

        Assert.Equal("cric/", ex.ImportSource);
    }

    [Fact]
    public async Task Import_ExceedingTwoThousandImages_ThrowsImportTooLargeException()
    {
        // 1. Setup base
        var admin = new User { Username = "admin", PasswordHash = "hash", Role = "admin" };
        var project = new Project { Name = "Proyecto Large", Description = "Test" };
        _context.Users.Add(admin);
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "Dataset Large", Description = "Test" };
        _context.Datasets.Add(dataset);
        await _context.SaveChangesAsync();

        // 2. Generar CSV con 2.001 imágenes distintas
        var sb = new System.Text.StringBuilder("image,cell,x,y,class\n");
        for (int i = 1; i <= 2001; i++)
        {
            sb.AppendLine($"img_{i}.png,1,100,100,NILM");
        }
        _storage.AddFile("cric_big/annotations.csv", sb.ToString());

        var request = new ImportRequest
        {
            Format = "cric",
            Source = "cric_big/",
            DryRun = true
        };

        // 3. Debe arrojar ImportTooLargeException (422)
        var ex = await Assert.ThrowsAsync<ImportTooLargeException>(() =>
            _importer.ImportAsync(dataset.Id, admin.Id, request));

        Assert.Equal(2001, ex.Count);
        Assert.Equal(2000, ex.Max);
    }

    [Fact]
    public async Task Controller_ImportAnnotations_ReturnsExpectedStatusCodes()
    {
        // 1. Setup base
        var admin = new User { Username = "admin", PasswordHash = "hash", Role = "admin" };
        var project = new Project { Name = "Controller Project", Description = "Test" };
        _context.Users.Add(admin);
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "Controller Dataset", Description = "Test" };
        _context.Datasets.Add(dataset);
        await _context.SaveChangesAsync();

        _storage.AddFile("cric/data.csv", "image,cell,x,y,class\nimg.png,1,500,500,NILM\n");

        var controller = new ImportsController([_importer], NullLogger<ImportsController>.Instance);
        SetControllerUser(controller, admin.Id, admin.Username, admin.Role);

        // 2. dryRun = true -> HTTP 200 OK
        var dryRunResult = await controller.ImportAnnotations(
            dataset.Id,
            new ImportRequest { Format = "cric", Source = "cric/", DryRun = true },
            CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(dryRunResult);
        var report1 = Assert.IsType<ImportReport>(okResult.Value);
        Assert.True(report1.DryRun);
        Assert.Null(report1.ImportId);

        // 3. dryRun = false -> HTTP 201 Created
        var execResult = await controller.ImportAnnotations(
            dataset.Id,
            new ImportRequest { Format = "cric", Source = "cric/", DryRun = false },
            CancellationToken.None);

        var createdResult = Assert.IsType<ObjectResult>(execResult);
        Assert.Equal(StatusCodes.Status201Created, createdResult.StatusCode);
        var report2 = Assert.IsType<ImportReport>(createdResult.Value);
        Assert.False(report2.DryRun);
        Assert.NotNull(report2.ImportId);
    }
}
