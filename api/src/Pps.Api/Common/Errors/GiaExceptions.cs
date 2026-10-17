namespace Pps.Api.Common.Errors;

public abstract class GiaProblemException : Exception
{
    public string ProblemType { get; }
    public int StatusCode { get; }
    public string Title { get; }
    public string? Detail { get; }
    public IDictionary<string, string[]>? ValidationErrors { get; }

    protected GiaProblemException(
        string problemType, 
        int statusCode, 
        string title, 
        string? detail = null,
        IDictionary<string, string[]>? validationErrors = null) 
        : base(detail ?? title)
    {
        ProblemType = problemType;
        StatusCode = statusCode;
        Title = title;
        Detail = detail;
        ValidationErrors = validationErrors;
    }
}

public class UnauthenticatedProblemException : GiaProblemException
{
    public UnauthenticatedProblemException(string detail = "No valid session found. Please log in.", string slug = "unauthenticated")
        : base(
            problemType: $"{GiaProblemTypes.Prefix}{slug}",
            statusCode: StatusCodes.Status401Unauthorized,
            title: "Unauthorized",
            detail: detail)
    {
    }
}

public class TooManyRequestsProblemException : GiaProblemException
{
    public TooManyRequestsProblemException(string detail = "Too many failed login attempts. Please try again later.", string slug = "too-many-requests")
        : base(
            problemType: $"{GiaProblemTypes.Prefix}{slug}",
            statusCode: StatusCodes.Status429TooManyRequests,
            title: "Too Many Requests",
            detail: detail)
    {
    }
}

public class NotFoundProblemException : GiaProblemException
{
    public NotFoundProblemException(string detail, string slug = "not-found")
        : base(
            problemType: $"{GiaProblemTypes.Prefix}{slug}",
            statusCode: StatusCodes.Status404NotFound,
            title: "Resource Not Found",
            detail: detail)
    {
    }
}

public class ForbiddenProblemException : GiaProblemException
{
    public ForbiddenProblemException(string detail, string slug = "forbidden")
        : base(
            problemType: $"{GiaProblemTypes.Prefix}{slug}",
            statusCode: StatusCodes.Status403Forbidden,
            title: "Forbidden",
            detail: detail)
    {
    }
}

public class ConflictProblemException : GiaProblemException
{
    public ConflictProblemException(string slug, string detail)
        : base(
            problemType: $"{GiaProblemTypes.Prefix}{slug}",
            statusCode: StatusCodes.Status409Conflict,
            title: "Conflict",
            detail: detail)
    {
    }
}

public class UnprocessableEntityProblemException : GiaProblemException
{
    public UnprocessableEntityProblemException(string slug, string detail)
        : base(
            problemType: $"{GiaProblemTypes.Prefix}{slug}",
            statusCode: StatusCodes.Status422UnprocessableEntity,
            title: "Unprocessable Entity",
            detail: detail)
    {
    }
}

public class PreconditionFailedProblemException : GiaProblemException
{
    public PreconditionFailedProblemException(string detail = "Version mismatch (ETag does not match)")
        : base(
            problemType: GiaProblemTypes.VersionMismatch,
            statusCode: StatusCodes.Status412PreconditionFailed,
            title: "Precondition Failed",
            detail: detail)
    {
    }
}

public class PreconditionRequiredProblemException : GiaProblemException
{
    public PreconditionRequiredProblemException(string detail = "If-Match header is required")
        : base(
            problemType: GiaProblemTypes.PreconditionRequired,
            statusCode: StatusCodes.Status428PreconditionRequired,
            title: "Precondition Required",
            detail: detail)
    {
    }
}
