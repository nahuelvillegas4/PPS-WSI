namespace Pps.Domain.Annotations;

public class GeometryOutOfBoundsException : Exception
{
    public GeometryOutOfBoundsException(string message) : base(message)
    {
    }
}

public class GeometryDegenerateException : Exception
{
    public GeometryDegenerateException(string message) : base(message)
    {
    }
}

public class GeometrySelfIntersectionException : Exception
{
    public GeometrySelfIntersectionException(string message) : base(message)
    {
    }
}

public class ClassNotInDatasetException : Exception
{
    public ClassNotInDatasetException(string message = "La clase especificada no pertenece al dataset de la imagen.") : base(message)
    {
    }
}
