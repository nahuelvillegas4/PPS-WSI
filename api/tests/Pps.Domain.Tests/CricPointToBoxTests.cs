namespace Pps.Domain.Tests;

using System.Text.Json;
using Pps.Domain.Import;
using Xunit;

public class CricPointToBoxTests
{
    private sealed class FixturePointToBoxCase
    {
        public double[] Nucleus { get; set; } = [];
        public double BoxSize { get; set; }
        public FixtureImage Image { get; set; } = new();
        public FixtureRectangle Rectangle { get; set; } = new();
        public bool Clipped { get; set; }
    }

    private sealed class FixtureImage
    {
        public double Width { get; set; }
        public double Height { get; set; }
    }

    private sealed class FixtureRectangle
    {
        public string Type { get; set; } = "rectangle";
        public double X { get; set; }
        public double Y { get; set; }
        public double Width { get; set; }
        public double Height { get; set; }
    }

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
    public void Convert_MatchesExactOfficialContractFixtures()
    {
        // 1. Cargar contract/fixtures/export.json
        var repoRoot = FindRepoRoot();
        var fixturePath = Path.Combine(repoRoot, "contract", "fixtures", "export.json");

        Assert.True(File.Exists(fixturePath), $"No se encontró el archivo de fixtures en: {fixturePath}");

        var json = File.ReadAllText(fixturePath);
        using var doc = JsonDocument.Parse(json);
        var casesElem = doc.RootElement.GetProperty("cricPointToBox");

        var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var cases = casesElem.Deserialize<List<FixturePointToBoxCase>>(jsonOptions);
        Assert.NotNull(cases);
        Assert.NotEmpty(cases);

        // 2. Probar cada caso oficial del contrato
        foreach (var c in cases)
        {
            var result = CricPointToBoxConverter.Convert(
                nucleusX: c.Nucleus[0],
                nucleusY: c.Nucleus[1],
                boxSize: c.BoxSize,
                imageWidth: c.Image.Width,
                imageHeight: c.Image.Height
            );

            Assert.True(result.IsValid, "La caja debe ser válida");
            Assert.Equal(c.Clipped, result.Clipped);
            Assert.Equal(c.Rectangle.X, result.Geometry.X);
            Assert.Equal(c.Rectangle.Y, result.Geometry.Y);
            Assert.Equal(c.Rectangle.Width, result.Geometry.Width);
            Assert.Equal(c.Rectangle.Height, result.Geometry.Height);
        }
    }

    [Fact]
    public void Convert_Case1_CenteredNucleus_Unclipped()
    {
        // Caso C1 de export.json: (650, 440) en 1376x1020 con boxSize 100
        var result = CricPointToBoxConverter.Convert(650, 440, 100, 1376, 1020);

        Assert.True(result.IsValid);
        Assert.False(result.Clipped);
        Assert.Equal(600, result.Geometry.X);
        Assert.Equal(390, result.Geometry.Y);
        Assert.Equal(100, result.Geometry.Width);
        Assert.Equal(100, result.Geometry.Height);
    }

    [Fact]
    public void Convert_Case2_NearBoundary_Clipped()
    {
        // Caso C2 de export.json: (30, 1000) en 1376x1020 con boxSize 100
        // X raw: [-20, 80] -> clipped [0, 80] (width 80)
        // Y raw: [950, 1050] -> clipped [950, 1020] (height 70)
        var result = CricPointToBoxConverter.Convert(30, 1000, 100, 1376, 1020);

        Assert.True(result.IsValid);
        Assert.True(result.Clipped);
        Assert.Equal(0, result.Geometry.X);
        Assert.Equal(950, result.Geometry.Y);
        Assert.Equal(80, result.Geometry.Width);
        Assert.Equal(70, result.Geometry.Height);
    }

    [Fact]
    public void Convert_OutOfBoundsNucleus_ReturnsInvalid()
    {
        var result = CricPointToBoxConverter.Convert(-500, -500, 100, 1376, 1020);
        Assert.False(result.IsValid);
    }
}
