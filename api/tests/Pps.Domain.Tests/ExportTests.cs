namespace Pps.Domain.Tests;

using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Json.Schema;
using Pps.Domain.Annotations;
using Pps.Domain.Export;
using Pps.Domain.Export.Internal;
using Xunit;

public class ExportTests
{
    private static string FindRepoRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current != null)
        {
            if (File.Exists(Path.Combine(current.FullName, "contract", "schemas", "internal-export.schema.json")))
            {
                return current.FullName;
            }
            current = current.Parent;
        }

        throw new FileNotFoundException("No se encontró la raíz del repositorio.");
    }

    private static readonly Lazy<JsonSchema> CachedSchema = new(() =>
    {
        var repoRoot = FindRepoRoot();
        var geometrySchemaPath = Path.Combine(repoRoot, "contract", "schemas", "geometry.schema.json");
        var internalSchemaPath = Path.Combine(repoRoot, "contract", "schemas", "internal-export.schema.json");

        var geometrySchema = JsonSchema.FromFile(geometrySchemaPath);
        SchemaRegistry.Global.Register(new Uri("geometry.schema.json", UriKind.RelativeOrAbsolute), geometrySchema);

        return JsonSchema.FromFile(internalSchemaPath);
    });

    private static JsonSchema LoadInternalExportSchema() => CachedSchema.Value;

    [Fact]
    public void ContractFixture_InternalExportExample_IsValidAccordingToSchema()
    {
        var repoRoot = FindRepoRoot();
        var fixturePath = Path.Combine(repoRoot, "contract", "fixtures", "export.json");
        var jsonContent = File.ReadAllText(fixturePath);

        using var doc = JsonDocument.Parse(jsonContent);
        var exampleElement = doc.RootElement.GetProperty("internalExportExample");

        var schema = LoadInternalExportSchema();
        var result = schema.Evaluate(exampleElement);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void InternalExportDocument_SerializedOutput_ValidatesAgainstSchema()
    {
        var schema = LoadInternalExportSchema();

        var document = new InternalExportDocument
        {
            Format = "gia-annotations",
            FormatVersion = "1.0",
            ExportedAt = "2026-10-21T22:30:00Z",
            ExportedBy = "nahuel",
            Filter = new ExportFilter
            {
                Authors = new List<long> { 1, 2 }
            },
            CoordinateSystem = new ExportCoordinateSystem(),
            Project = new ExportNamedEntity { Id = 1, Name = "Proyecto Cérvix" },
            Dataset = new ExportNamedEntity { Id = 5, Name = "Dataset Prueba" },
            Classes = new List<ExportLabelClass>
            {
                new() { Id = 10, Name = "NILM", Color = "#00ff00" },
                new() { Id = 11, Name = "HSIL", Color = "#ff0000" }
            },
            Authors = new List<ExportAuthor>
            {
                new() { Id = 1, Username = "nahuel", Kind = "human" },
                new() { Id = 2, Username = "import-cric", Kind = "import" }
            },
            Images = new List<ExportImage>
            {
                new()
                {
                    Id = 100,
                    StorageKey = "samples/sample-1.png",
                    Kind = "conventional",
                    Width = 1376,
                    Height = 1020,
                    MppX = null,
                    MppY = null,
                    Annotations = new List<ExportAnnotation>
                    {
                        new()
                        {
                            Id = 501,
                            ClassId = 10,
                            AuthorId = 1,
                            Source = "manual",
                            CreatedAt = "2026-10-21T20:00:00Z",
                            UpdatedAt = "2026-10-21T20:00:00Z",
                            Geometry = new RectangleGeometry { X = 100, Y = 100, Width = 50, Height = 50 },
                            Provenance = null
                        },
                        new()
                        {
                            Id = 502,
                            ClassId = 11,
                            AuthorId = 2,
                            Source = "import",
                            CreatedAt = "2026-10-21T21:00:00Z",
                            UpdatedAt = "2026-10-21T21:00:00Z",
                            Geometry = new PolygonGeometry
                            {
                                Points = new double[][]
                                {
                                    new double[] { 200, 200 },
                                    new double[] { 250, 200 },
                                    new double[] { 225, 250 }
                                }
                            },
                            Provenance = JsonDocument.Parse("{\"importId\": 42, \"format\": \"cric\"}").RootElement
                        }
                    }
                }
            }
        };

        var serializerOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.Never,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        };

        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(document, serializerOptions);
        using var generatedDoc = JsonDocument.Parse(jsonBytes);

        var eval = schema.Evaluate(generatedDoc.RootElement);

        Assert.True(eval.IsValid);
    }

    [Theory]
    [InlineData("me", 42, false, new long[] { 42 })]
    [InlineData("", 42, false, new long[] { 42 })]
    [InlineData(null, 42, false, new long[] { 42 })]
    [InlineData("   ", 42, false, new long[] { 42 })]
    [InlineData("all", 42, true, null)]
    [InlineData("ALL", 42, true, null)]
    [InlineData("2,5,10", 42, false, new long[] { 2, 5, 10 })]
    [InlineData(" 7 , 8 ", 42, false, new long[] { 7, 8 })]
    public void AuthorsFilterParser_ValidInputs_ParsesExpected(string? input, long currentUserId, bool expectedAll, long[]? expectedIds)
    {
        var (isAll, userIds) = AuthorsFilterParser.Parse(input, currentUserId);
        Assert.Equal(expectedAll, isAll);

        if (expectedIds == null)
        {
            Assert.Null(userIds);
        }
        else
        {
            Assert.NotNull(userIds);
            Assert.Equal(expectedIds, userIds);
        }
    }

    [Theory]
    [InlineData("foo")]
    [InlineData("2,abc")]
    [InlineData("0")]
    [InlineData("-5")]
    [InlineData(",")]
    public void AuthorsFilterParser_InvalidInputs_ThrowsInvalidAuthorsFilterException(string input)
    {
        Assert.Throws<InvalidAuthorsFilterException>(() => AuthorsFilterParser.Parse(input, 1));
    }

    [Theory]
    [InlineData("CRIC · subconjunto de prueba", 3, "cric-subconjunto-de-prueba")]
    [InlineData("Citología cervical", 1, "citologia-cervical")]
    [InlineData("Dataset #1 / test", 10, "dataset-1-test")]
    [InlineData("", 99, "dataset-99")]
    [InlineData("   ", 99, "dataset-99")]
    public void ExportSlugifier_Slugify_ProducesCleanSlugs(string input, long id, string expected)
    {
        var slug = ExportSlugifier.Slugify(input, id);
        Assert.Equal(expected, slug);
    }
}
