namespace Pps.Domain.Import;

public class AlreadyImportedException : Exception
{
    public string ImportSource { get; }

    public AlreadyImportedException(string source)
        : base($"La fuente '{source}' ya fue importada previamente en este dataset.")
    {
        ImportSource = source;
    }
}

public class ImportTooLargeException : Exception
{
    public int Count { get; }
    public int Max { get; }

    public ImportTooLargeException(int count, int max = 2000)
        : base($"La importación contiene {count} imágenes, superando el límite permitido de {max} imágenes (ADR-09).")
    {
        Count = count;
        Max = max;
    }
}

public class ImportValidationException : Exception
{
    public ImportValidationException(string message) : base(message)
    {
    }
}
