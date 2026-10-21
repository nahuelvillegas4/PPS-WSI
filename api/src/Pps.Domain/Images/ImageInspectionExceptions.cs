namespace Pps.Domain.Images;

public class ImageInspectionException : Exception
{
    public ImageInspectionException(string message, Exception? inner = null) : base(message, inner) { }
}

public class ImageFileNotFoundException : ImageInspectionException
{
    public string StorageKey { get; }

    public ImageFileNotFoundException(string storageKey) 
        : base($"El archivo '{storageKey}' no existe en el volumen de almacenamiento.")
    {
        StorageKey = storageKey;
    }
}

public class UnsupportedImageFormatException : ImageInspectionException
{
    public string StorageKey { get; }

    public UnsupportedImageFormatException(string storageKey, string detail = "Solo se aceptan formatos SVS, PNG y JPEG.") 
        : base(detail)
    {
        StorageKey = storageKey;
    }
}

public class TilesServiceUnavailableException : ImageInspectionException
{
    public TilesServiceUnavailableException(string message = "El servicio de teselas no está disponible.", Exception? inner = null) 
        : base(message, inner)
    {
    }
}
