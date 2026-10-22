namespace Pps.Api.Common.Errors;

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Pps.Domain.Annotations;
using Pps.Domain.Images;

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
        else if (exception is GeometryOutOfBoundsException oobEx)
        {
            problemType = GiaProblemTypes.GeometryOutOfBounds;
            statusCode = StatusCodes.Status422UnprocessableEntity;
            title = "Unprocessable Entity";
            detail = oobEx.Message;

            _logger.LogWarning(exception, "GIA Problem [422] {Type}: {Detail} (traceId: {TraceId})",
                problemType, detail, traceId);
        }
        else if (exception is GeometryDegenerateException degEx)
        {
            problemType = GiaProblemTypes.GeometryDegenerate;
            statusCode = StatusCodes.Status422UnprocessableEntity;
            title = "Unprocessable Entity";
            detail = degEx.Message;

            _logger.LogWarning(exception, "GIA Problem [422] {Type}: {Detail} (traceId: {TraceId})",
                problemType, detail, traceId);
        }
        else if (exception is GeometrySelfIntersectionException selfEx)
        {
            problemType = GiaProblemTypes.GeometrySelfIntersection;
            statusCode = StatusCodes.Status422UnprocessableEntity;
            title = "Unprocessable Entity";
            detail = selfEx.Message;

            _logger.LogWarning(exception, "GIA Problem [422] {Type}: {Detail} (traceId: {TraceId})",
                problemType, detail, traceId);
        }
        else if (exception is ClassNotInDatasetException classEx)
        {
            problemType = GiaProblemTypes.ClassNotInDataset;
            statusCode = StatusCodes.Status422UnprocessableEntity;
            title = "Unprocessable Entity";
            detail = classEx.Message;

            _logger.LogWarning(exception, "GIA Problem [422] {Type}: {Detail} (traceId: {TraceId})",
                problemType, detail, traceId);
        }
        else if (exception is InvalidStorageKeyException invalidKeyEx)
        {
            problemType = GiaProblemTypes.InvalidStorageKey;
            statusCode = StatusCodes.Status422UnprocessableEntity;
            title = "Unprocessable Entity";
            detail = invalidKeyEx.Message;

            _logger.LogWarning(exception, "GIA Problem [422] {Type}: {Detail} (traceId: {TraceId})",
                problemType, detail, traceId);
        }
        else if (exception is ImageFileNotFoundException notFoundEx)
        {
            problemType = GiaProblemTypes.NotFound;
            statusCode = StatusCodes.Status404NotFound;
            title = "Resource Not Found";
            detail = notFoundEx.Message;

            _logger.LogWarning(exception, "GIA Problem [404] {Type}: {Detail} (traceId: {TraceId})",
                problemType, detail, traceId);
        }
        else if (exception is UnsupportedImageFormatException unsupportedEx)
        {
            problemType = GiaProblemTypes.UnsupportedImageFormat;
            statusCode = StatusCodes.Status422UnprocessableEntity;
            title = "Unprocessable Entity";
            detail = unsupportedEx.Message;

            _logger.LogWarning(exception, "GIA Problem [422] {Type}: {Detail} (traceId: {TraceId})",
                problemType, detail, traceId);
        }
        else if (exception is TilesServiceUnavailableException tilesUnavailEx)
        {
            problemType = GiaProblemTypes.DependencyUnavailable;
            statusCode = StatusCodes.Status503ServiceUnavailable;
            title = "Service Unavailable";
            detail = tilesUnavailEx.Message;

            _logger.LogWarning(exception, "GIA Problem [503] {Type}: {Detail} (traceId: {TraceId})",
                problemType, detail, traceId);
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
