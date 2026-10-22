namespace Pps.Domain.Annotations;

public static class GeometryValidator
{
    public static void ValidateAgainstImage(Geometry geometry, double imageWidth, double imageHeight)
    {
        switch (geometry)
        {
            case RectangleGeometry rect:
                ValidateRectangle(rect, imageWidth, imageHeight);
                break;
            case PolygonGeometry poly:
                ValidatePolygon(poly, imageWidth, imageHeight);
                break;
            default:
                throw new ArgumentException($"Tipo de geometría desconocido: {geometry?.GetType().Name}");
        }
    }

    private static void ValidateRectangle(RectangleGeometry rect, double width, double height)
    {
        double x = rect.X ?? 0;
        double y = rect.Y ?? 0;
        double w = rect.Width ?? 0;
        double h = rect.Height ?? 0;

        if (x + w > width || y + h > height)
        {
            throw new GeometryOutOfBoundsException(
                $"El rectángulo ([{x}, {y}], {w}x{h}) excede los límites de la imagen ({width}x{height} px).");
        }
    }

    private static void ValidatePolygon(PolygonGeometry poly, double width, double height)
    {
        var pts = poly.Points ?? [];
        if (pts.Length < 3)
        {
            throw new GeometryDegenerateException("El polígono debe tener al menos 3 vértices.");
        }

        // 1. Límites (geometry-out-of-bounds)
        if (pts.Any(p => p[0] > width || p[1] > height || p[0] < 0 || p[1] < 0))
        {
            throw new GeometryOutOfBoundsException(
                $"Los vértices del polígono exceden los límites de la imagen ({width}x{height} px).");
        }

        // 2. Cierre explícito y vértices repetidos (geometry-degenerate)
        if (PointsEqual(pts[0], pts[^1]))
        {
            throw new GeometryDegenerateException(
                "El polígono no debe incluir cierre explícito (el último vértice repite el primero).");
        }

        for (int i = 0; i < pts.Length - 1; i++)
        {
            if (PointsEqual(pts[i], pts[i + 1]))
            {
                throw new GeometryDegenerateException(
                    $"El polígono contiene vértices consecutivos repetidos en el índice {i}.");
            }
        }

        // 3. Autointersección (geometry-self-intersection)
        int n = pts.Length;
        for (int i = 0; i < n; i++)
        {
            for (int j = i + 1; j < n; j++)
            {
                if (j == i + 1 || (i == 0 && j == n - 1))
                {
                    continue; // aristas adyacentes comparten un vértice
                }

                if (SegmentsIntersect(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]))
                {
                    throw new GeometrySelfIntersectionException("El polígono es autointersecante.");
                }
            }
        }

        // 4. Área nula / vértices colineales (geometry-degenerate)
        if (Math.Abs(ComputeSignedAreaDouble(pts)) < 1e-9)
        {
            throw new GeometryDegenerateException("El polígono tiene área nula (vértices colineales).");
        }
    }

    public static bool PointsEqual(double[] a, double[] b)
    {
        return Math.Abs(a[0] - b[0]) < 1e-9 && Math.Abs(a[1] - b[1]) < 1e-9;
    }

    public static double ComputeSignedAreaDouble(double[][] points)
    {
        double sum = 0;
        int n = points.Length;
        for (int i = 0; i < n; i++)
        {
            int next = (i + 1) % n;
            sum += points[i][0] * points[next][1] - points[next][0] * points[i][1];
        }
        return sum;
    }

    private static double Orient(double[] a, double[] b, double[] c)
    {
        return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    }

    private static bool OnSegment(double[] a, double[] b, double[] p)
    {
        return Math.Min(a[0], b[0]) <= p[0] && p[0] <= Math.Max(a[0], b[0])
            && Math.Min(a[1], b[1]) <= p[1] && p[1] <= Math.Max(a[1], b[1]);
    }

    private static bool SegmentsIntersect(double[] p1, double[] p2, double[] p3, double[] p4)
    {
        double d1 = Orient(p3, p4, p1);
        double d2 = Orient(p3, p4, p2);
        double d3 = Orient(p1, p2, p3);
        double d4 = Orient(p1, p2, p4);

        if (((d1 > 0) != (d2 > 0)) && ((d3 > 0) != (d4 > 0)) && d1 != 0 && d2 != 0 && d3 != 0 && d4 != 0)
        {
            return true;
        }

        return (d1 == 0 && OnSegment(p3, p4, p1))
            || (d2 == 0 && OnSegment(p3, p4, p2))
            || (d3 == 0 && OnSegment(p1, p2, p3))
            || (d4 == 0 && OnSegment(p1, p2, p4));
    }
}
