namespace Pps.Domain.Import;

using Pps.Domain.Annotations;

public record CricBoxResult(
    RectangleGeometry Geometry,
    bool Clipped,
    bool IsValid
);

public static class CricPointToBoxConverter
{
    public const double DefaultBoxSize = 100.0;

    /// <summary>
    /// Convierte un punto celular (núcleo) de CRIC en una caja cuadrada de lado boxSize centrada en el punto,
    /// recortada a los bordes de la imagen según ADR-09 y contract/fixtures/export.json.
    /// </summary>
    public static CricBoxResult Convert(
        double nucleusX,
        double nucleusY,
        double boxSize,
        double imageWidth,
        double imageHeight)
    {
        if (boxSize <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(boxSize), "El tamaño de caja (boxSize) debe ser estrictamente positivo.");
        }

        double half = boxSize / 2.0;
        double rawX0 = nucleusX - half;
        double rawY0 = nucleusY - half;
        double rawX1 = nucleusX + half;
        double rawY1 = nucleusY + half;

        // Recorte a los bordes de la imagen [0, imageWidth] y [0, imageHeight]
        double x0 = Math.Max(0.0, rawX0);
        double y0 = Math.Max(0.0, rawY0);
        double x1 = Math.Min(imageWidth, rawX1);
        double y1 = Math.Min(imageHeight, rawY1);

        double width = Math.Max(0.0, x1 - x0);
        double height = Math.Max(0.0, y1 - y0);

        // Si la caja quedó completamente afuera o con área nula
        if (width <= 0 || height <= 0 || x0 >= imageWidth || y0 >= imageHeight)
        {
            return new CricBoxResult(
                Geometry: new RectangleGeometry { X = x0, Y = y0, Width = 0, Height = 0 },
                Clipped: true,
                IsValid: false
            );
        }

        bool clipped = Math.Abs(x0 - rawX0) > 1e-6 ||
                       Math.Abs(y0 - rawY0) > 1e-6 ||
                       Math.Abs(x1 - rawX1) > 1e-6 ||
                       Math.Abs(y1 - rawY1) > 1e-6;

        return new CricBoxResult(
            Geometry: new RectangleGeometry
            {
                X = x0,
                Y = y0,
                Width = width,
                Height = height
            },
            Clipped: clipped,
            IsValid: true
        );
    }
}
