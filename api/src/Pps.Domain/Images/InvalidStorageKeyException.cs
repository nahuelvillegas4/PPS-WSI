namespace Pps.Domain.Images;

public class InvalidStorageKeyException : Exception
{
    public InvalidStorageKeyException(string message) : base(message)
    {
    }
}
