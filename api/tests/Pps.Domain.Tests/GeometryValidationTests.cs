namespace Pps.Domain.Tests;

using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Pps.Domain.Annotations;
using Xunit;

public class GeometryValidationTests
{
    private static string FindContractFixturesPath()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            var candidate = Path.Combine(current.FullName, "contract", "fixtures", "geometry-validation.json");
            if (File.Exists(candidate))
            {
                return candidate;
            }
            current = current.Parent;
        }

        throw new FileNotFoundException("No se encontró el archivo geometry-validation.json.");
    }

    private static (double width, double height, JsonElement root) LoadFixture()
    {
        var path = FindContractFixturesPath();
        var json = File.ReadAllText(path);
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var w = root.GetProperty("image").GetProperty("width").GetDouble();
        var h = root.GetProperty("image").GetProperty("height").GetDouble();
        return (w, h, root);
    }

    private static (bool IsValid, Geometry? Geometry, string? Error) TryDeserializeAndValidate(JsonElement element)
    {
        var rawJson = element.GetRawText();
        Geometry? geom;
        try
        {
            var options = new JsonSerializerOptions
            {
                UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow
            };
            geom = JsonSerializer.Deserialize<Geometry>(rawJson, options);
        }
        catch (Exception ex)
        {
            return (false, null, $"Deserialization failed: {ex.Message}");
        }

        if (geom == null)
        {
            return (false, null, "Deserialized to null");
        }

        var validationContext = new ValidationContext(geom);
        var validationResults = new List<ValidationResult>();
        bool isValid = Validator.TryValidateObject(geom, validationContext, validationResults, validateAllProperties: true);

        if (!isValid)
        {
            return (false, geom, string.Join("; ", validationResults.Select(r => r.ErrorMessage)));
        }

        return (true, geom, null);
    }

    [Fact]
    public void All_Valid_Fixtures_Must_Pass_Validation_And_Domain_Rules()
    {
        var (width, height, root) = LoadFixture();
        var validArray = root.GetProperty("valid");

        foreach (var item in validArray.EnumerateArray())
        {
            var id = item.GetProperty("id").GetString();
            var geomElement = item.GetProperty("geometry");

            var (isValid, geom, error) = TryDeserializeAndValidate(geomElement);
            Assert.True(isValid, $"Caso {id} debería ser estructuralmente válido pero falló: {error}");
            Assert.NotNull(geom);

            // Validar contra las dimensiones de la imagen (reglas de dominio 422)
            var ex = Record.Exception(() => GeometryValidator.ValidateAgainstImage(geom, width, height));
            Assert.Null(ex);

            // Bounding box y área deben ser positivos
            var (minX, minY, maxX, maxY) = geom.ComputeBbox();
            Assert.True(minX >= 0);
            Assert.True(minY >= 0);
            Assert.True(maxX >= minX);
            Assert.True(maxY >= minY);

            var area = geom.ComputeArea();
            Assert.True(area > 0);
        }
    }

    [Fact]
    public void All_Invalid_400_Fixtures_Must_Fail_Shape_Validation()
    {
        var (_, _, root) = LoadFixture();
        var invalidArray = root.GetProperty("invalid");

        foreach (var item in invalidArray.EnumerateArray())
        {
            var status = item.GetProperty("status").GetInt32();
            if (status != 400) continue;

            var id = item.GetProperty("id").GetString();
            var geomElement = item.GetProperty("geometry");

            var (isValid, _, _) = TryDeserializeAndValidate(geomElement);
            Assert.False(isValid, $"Caso {id} debería fallar la validación 400 de esquema pero fue considerado válido.");
        }
    }

    [Fact]
    public void All_Invalid_422_Fixtures_Must_Pass_Shape_Validation_And_Fail_Domain_Rules()
    {
        var (width, height, root) = LoadFixture();
        var invalidArray = root.GetProperty("invalid");

        foreach (var item in invalidArray.EnumerateArray())
        {
            var status = item.GetProperty("status").GetInt32();
            if (status != 422) continue;

            var id = item.GetProperty("id").GetString();
            var expectedType = item.GetProperty("type").GetString();
            var geomElement = item.GetProperty("geometry");

            var (isValid, geom, error) = TryDeserializeAndValidate(geomElement);
            Assert.True(isValid, $"Caso {id} debería ser estructuralmente válido (cumplir el esquema) pero falló: {error}");
            Assert.NotNull(geom);

            // Debe lanzar la excepción de dominio correspondiente
            var ex = Record.Exception(() => GeometryValidator.ValidateAgainstImage(geom, width, height));
            Assert.NotNull(ex);

            switch (expectedType)
            {
                case "urn:gia:problem:geometry-out-of-bounds":
                    Assert.IsType<GeometryOutOfBoundsException>(ex);
                    break;
                case "urn:gia:problem:geometry-degenerate":
                    Assert.IsType<GeometryDegenerateException>(ex);
                    break;
                case "urn:gia:problem:geometry-self-intersection":
                    Assert.IsType<GeometrySelfIntersectionException>(ex);
                    break;
                default:
                    Assert.Fail($"Caso {id} tiene un tipo esperado no reconocido: {expectedType}");
                    break;
            }
        }
    }

    [Fact]
    public void Serialize_And_Deserialize_Geometry_Must_Preserve_Type()
    {
        Geometry rect = new RectangleGeometry { X = 10, Y = 20, Width = 30, Height = 40 };
        var json = JsonSerializer.Serialize<Geometry>(rect);
        Assert.Contains("\"type\":\"rectangle\"", json);

        var deserialized = JsonSerializer.Deserialize<Geometry>(json);
        Assert.NotNull(deserialized);
        Assert.IsType<RectangleGeometry>(deserialized);

        Geometry poly = new PolygonGeometry { Points = [[10, 10], [110, 10], [60, 90]] };
        var jsonPoly = JsonSerializer.Serialize<Geometry>(poly);
        Assert.Contains("\"type\":\"polygon\"", jsonPoly);

        var deserializedPoly = JsonSerializer.Deserialize<Geometry>(jsonPoly);
        Assert.NotNull(deserializedPoly);
        Assert.IsType<PolygonGeometry>(deserializedPoly);

        // Out of order properties as stored by PostgreSQL jsonb
        var pgJson = "{\"x\": 600, \"y\": 390, \"type\": \"rectangle\", \"width\": 100, \"height\": 100}";
        var opts = new JsonSerializerOptions { AllowOutOfOrderMetadataProperties = true };
        var deserializedPg = JsonSerializer.Deserialize<Geometry>(pgJson, opts);
        Assert.NotNull(deserializedPg);
        Assert.IsType<RectangleGeometry>(deserializedPg);
    }
}
