namespace Pps.Api.Common.Middleware;

using Microsoft.AspNetCore.Http;

public class TraceIdDelegatingHandler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public TraceIdDelegatingHandler(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var traceId = _httpContextAccessor.HttpContext?.TraceIdentifier;
        if (!string.IsNullOrEmpty(traceId) && !request.Headers.Contains("X-Request-ID"))
        {
            request.Headers.Add("X-Request-ID", traceId);
        }

        return base.SendAsync(request, cancellationToken);
    }
}
