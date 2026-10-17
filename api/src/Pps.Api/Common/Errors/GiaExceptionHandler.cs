namespace Pps.Api.Common.Errors;

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

public class GiaExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GiaExceptionHandler> _logger;

    public GiaExceptionHandler(ILogger<GiaExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, 
        Exception exception, 
        CancellationToken cancellationToken)
    {
        var traceId = httpContext.TraceIdentifier;

        string problemType;
        int statusCode;
        string title;
        string? detail;
        IDictionary<string, string[]>? validationErrors = null;

        if (exception is GiaProblemException giaEx)
        {
            problemType = giaEx.ProblemType;
            statusCode = giaEx.StatusCode;
            title = giaEx.Title;
            detail = giaEx.Detail;
            validationErrors = giaEx.ValidationErrors;

            _logger.LogWarning(exception, "GIA Problem [{StatusCode}] {Type}: {Detail} (traceId: {TraceId})",
                statusCode, problemType, detail, traceId);
        }
        else
        {
            problemType = GiaProblemTypes.InternalServerError;
            statusCode = StatusCodes.Status500InternalServerError;
            title = "Internal Server Error";
            detail = httpContext.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment()
                ? exception.Message
                : "An unexpected error occurred.";

            _logger.LogError(exception, "Unhandled Exception (traceId: {TraceId}): {Message}", traceId, exception.Message);
        }

        var problemDetails = new ProblemDetails
        {
            Type = problemType,
            Title = title,
            Status = statusCode,
            Detail = detail,
            Instance = httpContext.Request.Path
        };

        problemDetails.Extensions["traceId"] = traceId;

        if (validationErrors != null && validationErrors.Count > 0)
        {
            problemDetails.Extensions["errors"] = validationErrors;
        }

        httpContext.Response.StatusCode = statusCode;
        httpContext.Response.ContentType = "application/problem+json";

        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);
        return true;
    }
}
