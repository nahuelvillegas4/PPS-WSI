namespace Pps.Domain.Tests;

using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Pps.Api.Common.Errors;
using Pps.Api.Controllers.Annotations;
using Pps.Api.Controllers.Annotations.Dtos;
using Pps.Domain.Annotations;
using Pps.Domain.Auth;
using Pps.Domain.Catalog;
using Pps.Domain.Images;
using Pps.Infrastructure.Persistence;
using Xunit;

public class AnnotationLifecycleAndConcurrencyTests
{
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

    private static async Task<(SqliteConnection conn, AppDbContext db, User userA, User userB, User admin, Dataset ds1, Dataset ds2, LabelClass class1A, LabelClass class1B, LabelClass class2A, MedicalImage image1)>
        SetupTestEnvironmentAsync()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var userA = new User { Username = "revisor_a", PasswordHash = "hash", Role = "annotator" };
        var userB = new User { Username = "revisor_b", PasswordHash = "hash", Role = "annotator" };
        var admin = new User { Username = "admin_user", PasswordHash = "hash", Role = "admin" };
        db.Users.AddRange(userA, userB, admin);
        await db.SaveChangesAsync();

        var project = new Project { Name = "Proyecto Citología LBC", Description = "Test Project" };
        db.Projects.Add(project);
        await db.SaveChangesAsync();

        var ds1 = new Dataset { Name = "Dataset Bethesda A", ProjectId = project.Id };
        var ds2 = new Dataset { Name = "Dataset Bethesda B", ProjectId = project.Id };
        db.Datasets.AddRange(ds1, ds2);
        await db.SaveChangesAsync();

        var class1A = new LabelClass { Name = "Célula Normal", Color = "#00FF00", DatasetId = ds1.Id };
        var class1B = new LabelClass { Name = "Célula Neoplásica", Color = "#FF0000", DatasetId = ds1.Id };
        var class2A = new LabelClass { Name = "Clase Ajena DS2", Color = "#0000FF", DatasetId = ds2.Id };
        db.LabelClasses.AddRange(class1A, class1B, class2A);
        await db.SaveChangesAsync();

        var image1 = new MedicalImage
        {
            DatasetId = ds1.Id,
            StorageKey = "datasets/1/cmu-test-1.svs",
            OriginalFilename = "cmu-test-1.svs",
            Kind = "wsi",
            Format = "svs",
            WidthL0 = 40000,
            HeightL0 = 30000,
            LevelCount = 4,
            MppX = 0.5,
            MppY = 0.5,
            CreatedAt = DateTime.UtcNow
        };
        db.Images.Add(image1);
        await db.SaveChangesAsync();

        return (connection, db, userA, userB, admin, ds1, ds2, class1A, class1B, class2A, image1);
    }

    [Fact]
    public async Task UpdateAnnotation_MoveAndResizeRectangle_UpdatesBboxAreaAndVersion()
    {
        var (conn, db, userA, _, _, _, _, class1A, _, _, image1) = await SetupTestEnvironmentAsync();
        await using (conn)
        await using (db)
        {
            var controller = new AnnotationsController(db, NullLogger<AnnotationsController>.Instance);
            SetControllerUser(controller, userA.Id, userA.Username, userA.Role);

            // 1. Crear rectángulo inicial
            var createRes = await controller.CreateAnnotation(
                image1.Id,
                new CreateAnnotationRequest
                {
                    ClassId = class1A.Id,
                    Geometry = new RectangleGeometry { X = 100, Y = 100, Width = 200, Height = 150 }
                },
                CancellationToken.None);

            var created = (AnnotationResponse)((CreatedResult)createRes.Result!).Value!;
            Assert.Equal(1u, created.Version);

            // 2. Actualizar: mover y cambiar dimensiones
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";
            var patchRes = await controller.UpdateAnnotation(
                created.Id,
                new UpdateAnnotationRequest
                {
                    Geometry = new RectangleGeometry { X = 500, Y = 600, Width = 300, Height = 400 }
                },
                CancellationToken.None);

            var updated = (AnnotationResponse)((OkObjectResult)patchRes.Result!).Value!;
            Assert.True(updated.Version > created.Version);
            Assert.Equal($"\"{updated.Version}\"", controller.Response.Headers.ETag.ToString());

            // 3. Verificar persistencia de bbox y área recalculada
            var dbAnn = await db.Annotations.FindAsync(created.Id);
            Assert.NotNull(dbAnn);
            Assert.Equal(500, dbAnn.BboxMinX);
            Assert.Equal(600, dbAnn.BboxMinY);
            Assert.Equal(800, dbAnn.BboxMaxX);
            Assert.Equal(1000, dbAnn.BboxMaxY);
            Assert.Equal(300 * 400, dbAnn.Area);
        }
    }

    [Fact]
    public async Task UpdateAnnotation_MovePolygonVertices_RecalculatesBboxAndAreaDeterministically()
    {
        var (conn, db, userA, _, _, _, _, class1A, _, _, image1) = await SetupTestEnvironmentAsync();
        await using (conn)
        await using (db)
        {
            var controller = new AnnotationsController(db, NullLogger<AnnotationsController>.Instance);
            SetControllerUser(controller, userA.Id, userA.Username, userA.Role);

            // Crear polígono triangular inicial: (0,0), (100,0), (100,100) -> Área = 5000
            var createRes = await controller.CreateAnnotation(
                image1.Id,
                new CreateAnnotationRequest
                {
                    ClassId = class1A.Id,
                    Geometry = new PolygonGeometry
                    {
                        Points = [[1000.0, 1000.0], [1200.0, 1000.0], [1200.0, 1200.0]]
                    }
                },
                CancellationToken.None);

            var created = (AnnotationResponse)((CreatedResult)createRes.Result!).Value!;

            // Modificar vértices a un rectángulo poligonal de 4 puntos: [2000, 2000] a [2500, 2400]
            // Ancho: 500, Alto: 400 -> Área = 200000
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";
            var patchRes = await controller.UpdateAnnotation(
                created.Id,
                new UpdateAnnotationRequest
                {
                    Geometry = new PolygonGeometry
                    {
                        Points =
                        [
                            [2000.0, 2000.0],
                            [2500.0, 2000.0],
                            [2500.0, 2400.0],
                            [2000.0, 2400.0]
                        ]
                    }
                },
                CancellationToken.None);

            var updated = (AnnotationResponse)((OkObjectResult)patchRes.Result!).Value!;
            var polyGeom = Assert.IsType<PolygonGeometry>(updated.Geometry);
            Assert.NotNull(polyGeom.Points);
            Assert.Equal(4, polyGeom.Points.Length);

            var dbAnn = await db.Annotations.FindAsync(created.Id);
            Assert.NotNull(dbAnn);
            Assert.Equal(2000.0, dbAnn.BboxMinX);
            Assert.Equal(2000.0, dbAnn.BboxMinY);
            Assert.Equal(2500.0, dbAnn.BboxMaxX);
            Assert.Equal(2400.0, dbAnn.BboxMaxY);
            Assert.Equal(200000.0, dbAnn.Area, 2);
        }
    }

    [Fact]
    public async Task UpdateAnnotation_PolygonSpatialViolations_RejectWith422()
    {
        var (conn, db, userA, _, _, _, _, class1A, _, _, image1) = await SetupTestEnvironmentAsync();
        await using (conn)
        await using (db)
        {
            var controller = new AnnotationsController(db, NullLogger<AnnotationsController>.Instance);
            SetControllerUser(controller, userA.Id, userA.Username, userA.Role);

            var createRes = await controller.CreateAnnotation(
                image1.Id,
                new CreateAnnotationRequest
                {
                    ClassId = class1A.Id,
                    Geometry = new PolygonGeometry
                    {
                        Points = [[100.0, 100.0], [200.0, 100.0], [200.0, 200.0]]
                    }
                },
                CancellationToken.None);

            var created = (AnnotationResponse)((CreatedResult)createRes.Result!).Value!;
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";

            // 1. Fuera de límites de imagen (image1 es 40000 x 30000)
            await Assert.ThrowsAsync<GeometryOutOfBoundsException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest
                    {
                        Geometry = new PolygonGeometry
                        {
                            Points = [[100.0, 100.0], [45000.0, 100.0], [200.0, 200.0]]
                        }
                    },
                    CancellationToken.None));

            // 2. Autointersección (polígono con forma de reloj de arena / lazo)
            await Assert.ThrowsAsync<GeometrySelfIntersectionException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest
                    {
                        Geometry = new PolygonGeometry
                        {
                            Points =
                            [
                                [0.0, 0.0],
                                [100.0, 100.0],
                                [0.0, 100.0],
                                [100.0, 0.0]
                            ]
                        }
                    },
                    CancellationToken.None));

            // 3. Cierre explícito (último punto repite el primero)
            await Assert.ThrowsAsync<GeometryDegenerateException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest
                    {
                        Geometry = new PolygonGeometry
                        {
                            Points =
                            [
                                [10.0, 10.0],
                                [20.0, 10.0],
                                [20.0, 20.0],
                                [10.0, 10.0]
                            ]
                        }
                    },
                    CancellationToken.None));

            // 4. Puntos colineales / área cero
            await Assert.ThrowsAsync<GeometryDegenerateException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest
                    {
                        Geometry = new PolygonGeometry
                        {
                            Points =
                            [
                                [10.0, 10.0],
                                [20.0, 20.0],
                                [30.0, 30.0]
                            ]
                        }
                    },
                    CancellationToken.None));
        }
    }

    [Fact]
    public async Task UpdateAnnotation_ReassignClass_ValidSameDatasetSucceeds_ForeignDatasetFails422()
    {
        var (conn, db, userA, _, _, _, _, class1A, class1B, class2A, image1) = await SetupTestEnvironmentAsync();
        await using (conn)
        await using (db)
        {
            var controller = new AnnotationsController(db, NullLogger<AnnotationsController>.Instance);
            SetControllerUser(controller, userA.Id, userA.Username, userA.Role);

            var createRes = await controller.CreateAnnotation(
                image1.Id,
                new CreateAnnotationRequest
                {
                    ClassId = class1A.Id,
                    Geometry = new RectangleGeometry { X = 10, Y = 10, Width = 50, Height = 50 }
                },
                CancellationToken.None);

            var created = (AnnotationResponse)((CreatedResult)createRes.Result!).Value!;

            // 1. Reasignar a clase 1B (mismo dataset) -> éxito
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";
            var patchOk = await controller.UpdateAnnotation(
                created.Id,
                new UpdateAnnotationRequest { ClassId = class1B.Id },
                CancellationToken.None);

            var updatedOk = (AnnotationResponse)((OkObjectResult)patchOk.Result!).Value!;
            Assert.Equal(class1B.Id, updatedOk.ClassId);

            // 2. Intentar reasignar a clase 2A (dataset 2) -> 422 ClassNotInDatasetException
            controller.HttpContext.Request.Headers.IfMatch = $"\"{updatedOk.Version}\"";
            await Assert.ThrowsAsync<ClassNotInDatasetException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest { ClassId = class2A.Id },
                    CancellationToken.None));

            // 3. Intentar reasignar a clase inexistente -> 422
            await Assert.ThrowsAsync<ClassNotInDatasetException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest { ClassId = 99999 },
                    CancellationToken.None));
        }
    }

    [Fact]
    public async Task UpdateAnnotation_OptimisticConcurrency_MissingHeader428_StaleVersion412_AcceptsWeakAndRaw()
    {
        var (conn, db, userA, _, _, _, _, class1A, _, _, image1) = await SetupTestEnvironmentAsync();
        await using (conn)
        await using (db)
        {
            var controller = new AnnotationsController(db, NullLogger<AnnotationsController>.Instance);
            SetControllerUser(controller, userA.Id, userA.Username, userA.Role);

            var createRes = await controller.CreateAnnotation(
                image1.Id,
                new CreateAnnotationRequest
                {
                    ClassId = class1A.Id,
                    Geometry = new RectangleGeometry { X = 10, Y = 10, Width = 50, Height = 50 }
                },
                CancellationToken.None);

            var created = (AnnotationResponse)((CreatedResult)createRes.Result!).Value!;

            // 1. Sin cabecera If-Match -> 428 Precondition Required
            controller.HttpContext.Request.Headers.IfMatch = "";
            var ex428 = await Assert.ThrowsAsync<PreconditionRequiredProblemException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest { Geometry = new RectangleGeometry { X = 20, Y = 20, Width = 30, Height = 30 } },
                    CancellationToken.None));
            Assert.Equal("urn:gia:problem:precondition-required", ex428.ProblemType);

            // 2. Cabecera If-Match con versión incorrecta -> 412 Precondition Failed
            controller.HttpContext.Request.Headers.IfMatch = "\"999\"";
            var ex412 = await Assert.ThrowsAsync<PreconditionFailedProblemException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest { Geometry = new RectangleGeometry { X = 20, Y = 20, Width = 30, Height = 30 } },
                    CancellationToken.None));
            Assert.Equal("urn:gia:problem:version-mismatch", ex412.ProblemType);

            // 3. Cabecera con formato débil W/"1" -> éxito
            controller.HttpContext.Request.Headers.IfMatch = $"W/\"{created.Version}\"";
            var patchRes1 = await controller.UpdateAnnotation(
                created.Id,
                new UpdateAnnotationRequest { Geometry = new RectangleGeometry { X = 20, Y = 20, Width = 30, Height = 30 } },
                CancellationToken.None);
            var updated1 = (AnnotationResponse)((OkObjectResult)patchRes1.Result!).Value!;

            // 4. Intentar actualizar de nuevo con la versión vieja que ya mutó -> 412
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";
            await Assert.ThrowsAsync<PreconditionFailedProblemException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest { Geometry = new RectangleGeometry { X = 30, Y = 30, Width = 40, Height = 40 } },
                    CancellationToken.None));

            // 5. Actualizar con la nueva versión -> éxito
            controller.HttpContext.Request.Headers.IfMatch = $"{updated1.Version}";
            var patchRes2 = await controller.UpdateAnnotation(
                created.Id,
                new UpdateAnnotationRequest { Geometry = new RectangleGeometry { X = 30, Y = 30, Width = 40, Height = 40 } },
                CancellationToken.None);
            Assert.NotNull(patchRes2.Result);
        }
    }

    [Fact]
    public async Task MultiUserIsolation_CannotUpdateOrDeleteForeignAnnotation_EvenAdminIsForbidden()
    {
        var (conn, db, userA, userB, admin, _, _, class1A, _, _, image1) = await SetupTestEnvironmentAsync();
        await using (conn)
        await using (db)
        {
            var controller = new AnnotationsController(db, NullLogger<AnnotationsController>.Instance);

            // Usuario A crea anotación
            SetControllerUser(controller, userA.Id, userA.Username, userA.Role);
            var createRes = await controller.CreateAnnotation(
                image1.Id,
                new CreateAnnotationRequest
                {
                    ClassId = class1A.Id,
                    Geometry = new RectangleGeometry { X = 10, Y = 10, Width = 50, Height = 50 }
                },
                CancellationToken.None);
            var created = (AnnotationResponse)((CreatedResult)createRes.Result!).Value!;

            // 1. Usuario B intenta modificar -> 403 Forbidden
            SetControllerUser(controller, userB.Id, userB.Username, userB.Role);
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";
            var exPatchB = await Assert.ThrowsAsync<ForbiddenProblemException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest { Geometry = new RectangleGeometry { X = 20, Y = 20, Width = 20, Height = 20 } },
                    CancellationToken.None));
            Assert.Equal("urn:gia:problem:forbidden", exPatchB.ProblemType);

            // 2. Administrador intenta modificar anotación de A -> 403 Forbidden (ADR-07)
            SetControllerUser(controller, admin.Id, admin.Username, admin.Role);
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";
            var exPatchAdmin = await Assert.ThrowsAsync<ForbiddenProblemException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest { Geometry = new RectangleGeometry { X = 20, Y = 20, Width = 20, Height = 20 } },
                    CancellationToken.None));
            Assert.Equal("urn:gia:problem:forbidden", exPatchAdmin.ProblemType);

            // 3. Usuario B intenta borrar anotación de A -> 403 Forbidden
            SetControllerUser(controller, userB.Id, userB.Username, userB.Role);
            var exDeleteB = await Assert.ThrowsAsync<ForbiddenProblemException>(() =>
                controller.DeleteAnnotation(created.Id, CancellationToken.None));
            Assert.Equal("urn:gia:problem:forbidden", exDeleteB.ProblemType);
        }
    }

    [Fact]
    public async Task DeleteAnnotation_SoftDelete_ExcludesFromQueries_AndReturns404Afterward()
    {
        var (conn, db, userA, _, _, _, _, class1A, _, _, image1) = await SetupTestEnvironmentAsync();
        await using (conn)
        await using (db)
        {
            var controller = new AnnotationsController(db, NullLogger<AnnotationsController>.Instance);
            SetControllerUser(controller, userA.Id, userA.Username, userA.Role);

            // Crear anotación
            var createRes = await controller.CreateAnnotation(
                image1.Id,
                new CreateAnnotationRequest
                {
                    ClassId = class1A.Id,
                    Geometry = new RectangleGeometry { X = 10, Y = 10, Width = 50, Height = 50 }
                },
                CancellationToken.None);
            var created = (AnnotationResponse)((CreatedResult)createRes.Result!).Value!;

            // 1. DELETE con If-Match inválido -> 412
            controller.HttpContext.Request.Headers.IfMatch = "\"9999\"";
            await Assert.ThrowsAsync<PreconditionFailedProblemException>(() =>
                controller.DeleteAnnotation(created.Id, CancellationToken.None));

            // 2. DELETE con If-Match válido -> 204 NoContent
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";
            var deleteResult = await controller.DeleteAnnotation(created.Id, CancellationToken.None);
            Assert.IsType<NoContentResult>(deleteResult);

            // 3. En la base de datos, el registro sigue existiendo con DeletedAt seteado (Borrado Lógico)
            var rawAnn = await db.Annotations.IgnoreQueryFilters().FirstOrDefaultAsync(a => a.Id == created.Id);
            Assert.NotNull(rawAnn);
            Assert.NotNull(rawAnn.DeletedAt);

            // 4. GET individual posterior -> 404 NotFound
            await Assert.ThrowsAsync<NotFoundProblemException>(() =>
                controller.GetAnnotation(created.Id, CancellationToken.None));

            // 5. PATCH posterior -> 404 NotFound
            controller.HttpContext.Request.Headers.IfMatch = $"\"{created.Version}\"";
            await Assert.ThrowsAsync<NotFoundProblemException>(() =>
                controller.UpdateAnnotation(
                    created.Id,
                    new UpdateAnnotationRequest { Geometry = new RectangleGeometry { X = 50, Y = 50, Width = 10, Height = 10 } },
                    CancellationToken.None));

            // 6. DELETE repetido -> 404 NotFound
            await Assert.ThrowsAsync<NotFoundProblemException>(() =>
                controller.DeleteAnnotation(created.Id, CancellationToken.None));

            // 7. ListAnnotations ya no la incluye
            var listRes = await controller.ListAnnotations(image1.Id, author: "me", CancellationToken.None);
            var listData = (AnnotationListResponse)((OkObjectResult)listRes.Result!).Value!;
            Assert.Empty(listData.Items);
        }
    }
}
