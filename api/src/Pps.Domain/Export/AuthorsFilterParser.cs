namespace Pps.Domain.Export;

public class InvalidAuthorsFilterException : Exception
{
    public InvalidAuthorsFilterException(string message) : base(message)
    {
    }
}

public static class AuthorsFilterParser
{
    public static (bool isAll, List<long>? userIds) Parse(string? filter, long currentUserId)
    {
        if (string.IsNullOrWhiteSpace(filter) || filter.Equals("me", StringComparison.OrdinalIgnoreCase))
        {
            return (false, new List<long> { currentUserId });
        }

        if (filter.Equals("all", StringComparison.OrdinalIgnoreCase))
        {
            return (true, null);
        }

        var parts = filter.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var ids = new List<long>();
        foreach (var part in parts)
        {
            if (long.TryParse(part, out var id) && id > 0)
            {
                ids.Add(id);
            }
            else
            {
                throw new InvalidAuthorsFilterException($"El valor '{part}' en el filtro 'authors' no es un ID de usuario válido.");
            }
        }

        if (ids.Count == 0)
        {
            throw new InvalidAuthorsFilterException("El filtro 'authors' debe contener al menos un ID numérico o 'me'/'all'.");
        }

        return (false, ids);
    }
}
