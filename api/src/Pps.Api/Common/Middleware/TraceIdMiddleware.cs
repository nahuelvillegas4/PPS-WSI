namespace Pps.Api.Common.Middleware;

public class TraceIdMiddleware
{
    private readonly RequestDelegate _next;
    public const string HeaderName = "X-Request-ID";

    public TraceIdMiddleware(RequestDelegate _next)
    {
        this._next = _next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Leer el encabezado X-Request-ID proveniente del Gateway Nginx o generar uno nuevo (ADR-05, §8.7)
        if (context.Request.Headers.TryGetValue(HeaderName, out var incomingTraceId) && !string.IsNullOrWhiteSpace(incomingTraceId))
        {
            context.TraceIdentifier = incomingTraceId.ToString();
        }

        context.Response.Headers[HeaderName] = context.TraceIdentifier;

        await _next(context);
    }
}

public static class TraceIdMiddlewareExtensions
{
    public static IApplicationBuilder UseTraceId(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TraceIdMiddleware>();
    }
}
