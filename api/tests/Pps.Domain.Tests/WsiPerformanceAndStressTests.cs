namespace Pps.Domain.Tests;

using System.Diagnostics;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pps.Api.Controllers.Annotations;
using Pps.Api.Controllers.Annotations.Dtos;
using Pps.Domain.Annotations;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Infrastructure.Persistence;
using Xunit;
using Xunit.Abstractions;

public class WsiPerformanceAndStressTests : IDisposable
{
    private readonly ITestOutputHelper _output;
    private readonly SqliteConnection _connection;
    private readonly AppDbContext _context;

    public WsiPerformanceAndStressTests(ITestOutputHelper output)
    {
        _output = output;
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _context = new AppDbContext(options);
        _context.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _context.Dispose();
        _connection.Dispose();
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
    public void GeometryValidator_Throughput_ValidatesOneThousandWsiGeometriesRapidly()
    {
        // Generar 1.000 geometrías (500 rectángulos y 500 polígonos complejos) en coordenadas WSI (46.000 x 32.893 px)
        var geometries = new List<Geometry>(1000);
        var rng = new Random(42);

        for (int i = 0; i < 500; i++)
        {
            double x = rng.NextDouble() * 40000;
            double y = rng.NextDouble() * 30000;
            double w = 50 + rng.NextDouble() * 500;
            double h = 50 + rng.NextDouble() * 500;

            geometries.Add(new RectangleGeometry { X = x, Y = y, Width = w, Height = h });
        }

        for (int i = 0; i < 500; i++)
        {
            double cx = 1000 + rng.NextDouble() * 40000;
            double cy = 1000 + rng.NextDouble() * 30000;
            double r = 100 + rng.NextDouble() * 200;
            int vertexCount = 12; // Polígono convexo regular de 12 vértices

            var points = new double[vertexCount][];
            for (int v = 0; v < vertexCount; v++)
            {
                double angle = (2.0 * Math.PI * v) / vertexCount;
                points[v] = [cx + r * Math.Cos(angle), cy + r * Math.Sin(angle)];
            }

            geometries.Add(new PolygonGeometry { Points = points });
        }

        // Medición de rendimiento algorítmico (validación de límites, auto-intersección de segmentos y cálculo de área de Gauss)
        var sw = Stopwatch.StartNew();
        foreach (var geom in geometries)
        {
            GeometryValidator.ValidateAgainstImage(geom, 46000, 32893);
        }
        sw.Stop();

        _output.WriteLine($"Validación de 1.000 geometrías WSI completada en: {sw.ElapsedMilliseconds} ms ({(double)sw.ElapsedMilliseconds / 1000.0:F4} ms/geom)");
        Assert.True(sw.ElapsedMilliseconds < 250, $"La validación algorítmica de 1.000 geometrías tardó {sw.ElapsedMilliseconds} ms, superando el límite de 250 ms.");
    }

    [Fact]
    public async Task MassiveWsiAnnotations_CreateAndQueryHundreds_MeetsPerformanceCriteria()
    {
        // 1. Preparación de datos base
        var userA = new User { Username = "revisor_a", PasswordHash = "hash", Role = "annotator" };
        var userB = new User { Username = "revisor_b", PasswordHash = "hash", Role = "annotator" };
        var project = new Project { Name = "Proyecto WSI Gran Escala", Description = "Benchmark WSI" };
        _context.Users.AddRange(userA, userB);
        _context.Projects.Add(project);
        await _context.SaveChangesAsync();

        var dataset = new Dataset { ProjectId = project.Id, Name = "Dataset Biopsias SVS", Description = "WSI Annotations" };
        _context.Datasets.Add(dataset);
        await _context.SaveChangesAsync();

        var labelClass1 = new LabelClass { DatasetId = dataset.Id, Name = "Tumoral", Color = "#ff0000", DisplayOrder = 0 };
        var labelClass2 = new LabelClass { DatasetId = dataset.Id, Name = "Estroma", Color = "#00ff00", DisplayOrder = 1 };
        _context.LabelClasses.AddRange(labelClass1, labelClass2);

        var wsiImage = new MedicalImage
        {
            DatasetId = dataset.Id,
            StorageKey = "datasets/1/CMU-1-JP2K-33005.svs",
            OriginalFilename = "CMU-1-JP2K-33005.svs",
            Format = "svs",
            Kind = "wsi",
            WidthL0 = 46000,
            HeightL0 = 32893,
            LevelCount = 3,
            MppX = 0.499,
            MppY = 0.499
        };
        _context.Images.Add(wsiImage);
        await _context.SaveChangesAsync();

        var controller = new AnnotationsController(_context, NullLogger<AnnotationsController>.Instance);
        SetControllerUser(controller, userA.Id, userA.Username, userA.Role);

        // 2. Creación masiva de 200 anotaciones en nivel 0 por Revisor A
        var swCreation = Stopwatch.StartNew();
        var rng = new Random(1234);

        for (int i = 0; i < 200; i++)
        {
            long classId = (i % 2 == 0) ? labelClass1.Id : labelClass2.Id;
            Geometry geom;

            if (i % 2 == 0)
            {
                geom = new RectangleGeometry
                {
                    X = rng.Next(100, 44000),
                    Y = rng.Next(100, 31000),
                    Width = rng.Next(100, 1500),
                    Height = rng.Next(100, 1500)
                };
            }
            else
            {
                double cx = rng.Next(2000, 43000);
                double cy = rng.Next(2000, 30000);
                geom = new PolygonGeometry
                {
                    Points =
                    [
                        [cx - 200, cy - 200],
                        [cx + 200, cy - 150],
                        [cx + 300, cy + 100],
                        [cx, cy + 250],
                        [cx - 250, cy + 150]
                    ]
                };
            }

            var request = new CreateAnnotationRequest
            {
                ClassId = classId,
                Geometry = geom
            };

            var res = await controller.CreateAnnotation(wsiImage.Id, request, CancellationToken.None);
            Assert.IsType<CreatedResult>(res.Result);
        }
        swCreation.Stop();

        _output.WriteLine($"Creación persistida de 200 anotaciones WSI: {swCreation.ElapsedMilliseconds} ms ({(double)swCreation.ElapsedMilliseconds / 200.0:F2} ms/anotación)");

        // 3. Creación de 50 anotaciones adicionales por Revisor B sobre la misma WSI
        SetControllerUser(controller, userB.Id, userB.Username, userB.Role);
        for (int i = 0; i < 50; i++)
        {
            var res = await controller.CreateAnnotation(wsiImage.Id, new CreateAnnotationRequest
            {
                ClassId = labelClass1.Id,
                Geometry = new RectangleGeometry
                {
                    X = 5000 + i * 50,
                    Y = 5000 + i * 50,
                    Width = 100,
                    Height = 100
                }
            }, CancellationToken.None);
            Assert.IsType<CreatedResult>(res.Result);
        }

        // 4. Medición de consulta de anotaciones (Revisor B pide author=me -> 50 anotaciones)
        var swQueryMe = Stopwatch.StartNew();
        var resMe = await controller.ListAnnotations(wsiImage.Id, author: "me");
        swQueryMe.Stop();

        var okMe = Assert.IsType<OkObjectResult>(resMe.Result);
        var listMe = Assert.IsType<AnnotationListResponse>(okMe.Value);
        Assert.Equal(50, listMe.Items.Count);
        _output.WriteLine($"Consulta filtrada por author=me (50 items): {swQueryMe.ElapsedMilliseconds} ms");
        Assert.True(swQueryMe.ElapsedMilliseconds < 100, "La consulta filtrada debe resolverse en < 100 ms");

        // 5. Medición de consulta global (author=all -> 250 anotaciones consolidadas)
        var swQueryAll = Stopwatch.StartNew();
        var resAll = await controller.ListAnnotations(wsiImage.Id, author: "all");
        swQueryAll.Stop();

        var okAll = Assert.IsType<OkObjectResult>(resAll.Result);
        var listAll = Assert.IsType<AnnotationListResponse>(okAll.Value);
        Assert.Equal(250, listAll.Items.Count);
        _output.WriteLine($"Consulta global author=all (250 items con geometrías completas): {swQueryAll.ElapsedMilliseconds} ms");
        Assert.True(swQueryAll.ElapsedMilliseconds < 150, "La consulta masiva debe resolverse en < 150 ms");

        // 6. Verificar integridad de coordenadas en nivel 0 (QS-1 / QS-2)
        foreach (var ann in listAll.Items)
        {
            Assert.NotNull(ann.Geometry);
            if (ann.Geometry is RectangleGeometry rect)
            {
                Assert.True(rect.X >= 0 && rect.X + rect.Width <= 46000);
                Assert.True(rect.Y >= 0 && rect.Y + rect.Height <= 32893);
            }
        }
    }
}
