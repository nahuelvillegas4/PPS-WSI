namespace Pps.Domain.Export.Coco;

using Pps.Domain.Annotations;

public record CocoGeometryResult(
    double[] Bbox,
    List<double[]> Segmentation,
    double Area
);

public static class CocoGeometryConverter
{
    public static CocoGeometryResult Convert(Geometry geometry)
    {
        ArgumentNullException.ThrowIfNull(geometry);

        if (geometry is RectangleGeometry rect)
        {
            if (!rect.X.HasValue || !rect.Y.HasValue || !rect.Width.HasValue || !rect.Height.HasValue)
            {
                throw new InvalidOperationException("El rectángulo no contiene dimensiones y coordenadas completas.");
            }

            double x = rect.X.Value;
            double y = rect.Y.Value;
            double w = rect.Width.Value;
            double h = rect.Height.Value;

            // Bbox: [x, y, width, height]
            var bbox = new double[] { x, y, w, h };

            // Segmentation: 4 vertices clockwise starting from top-left:
            // (x, y) -> (x + width, y) -> (x + width, y + height) -> (x, y + height)
            var segmentation = new List<double[]>
            {
                new double[]
                {
                    x,
                    y,
                    x + w,
                    y,
                    x + w,
                    y + h,
                    x,
                    y + h
                }
            };

            var area = w * h;

            return new CocoGeometryResult(bbox, segmentation, area);
        }

        if (geometry is PolygonGeometry poly)
        {
            if (poly.Points == null || poly.Points.Length < 3)
            {
                throw new InvalidOperationException("Un polígono debe contener al menos 3 vértices para ser exportado a COCO.");
            }

            double minX = double.MaxValue;
            double minY = double.MaxValue;
            double maxX = double.MinValue;
            double maxY = double.MinValue;

            var flat = new double[poly.Points.Length * 2];
            for (int i = 0; i < poly.Points.Length; i++)
            {
                var pt = poly.Points[i];
                double x = pt[0];
                double y = pt[1];

                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;

                flat[i * 2] = x;
                flat[i * 2 + 1] = y;
            }

            var bbox = new double[] { minX, minY, maxX - minX, maxY - minY };
            var segmentation = new List<double[]> { flat };
            var area = Math.Abs(GeometryValidator.ComputeSignedAreaDouble(poly.Points)) / 2.0;

            return new CocoGeometryResult(bbox, segmentation, area);
        }

        throw new NotSupportedException($"Tipo de geometría no soportado para exportación COCO: {geometry.GetType().Name}.");
    }
}
