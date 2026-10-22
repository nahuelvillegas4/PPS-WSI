using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Pps.Api.Common.Errors;
using Pps.Api.Common.Middleware;
using Pps.Api.Common.Security;
using Pps.Domain.Auth;
using Pps.Domain.Export;
using Pps.Domain.Images;
using Pps.Infrastructure.Export;
using Pps.Infrastructure.Persistence;
using Pps.Infrastructure.Storage;

var builder = WebApplication.CreateBuilder(args);

// 1. Data Protection: persistencia de claves de sesión (ADR-04)
var keysPath = builder.Configuration["DATA_PROTECTION_KEYS_PATH"] 
               ?? Path.Combine(builder.Environment.ContentRootPath, "keys");
if (!Directory.Exists(keysPath))
{
    Directory.CreateDirectory(keysPath);
}
builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(keysPath))
    .SetApplicationName("gia-platform");

// 2. Base de datos PostgreSQL con convención snake_case (ADR-07, §8.2)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                       ?? "Host=localhost;Port=5432;Database=gia_db;Username=gia_user;Password=gia_dev_password_change_me;";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(connectionString)
           .UseSnakeCaseNamingConvention();
});

// 3. Autenticación por Cookie 'gia_session' (ADR-04)
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "gia_session";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;

        var cookieSecure = builder.Configuration.GetValue<bool?>("COOKIE_SECURE") 
                           ?? !builder.Environment.IsDevelopment();
        options.Cookie.SecurePolicy = cookieSecure 
            ? CookieSecurePolicy.Always 
            : CookieSecurePolicy.SameAsRequest;

        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;

        // Responder 401 y 403 con RFC 9457 sin redirigir a HTML de login (ADR-04, §8.5)
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            context.Response.ContentType = "application/problem+json";
            var problem = new ProblemDetails
            {
                Type = GiaProblemTypes.Unauthenticated,
                Title = "Unauthorized",
                Status = StatusCodes.Status401Unauthorized,
                Detail = "No valid session found. Please log in.",
                Instance = context.Request.Path
            };
            problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
            return context.Response.WriteAsJsonAsync(problem);
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            context.Response.ContentType = "application/problem+json";
            var problem = new ProblemDetails
            {
                Type = GiaProblemTypes.Forbidden,
                Title = "Forbidden",
                Status = StatusCodes.Status403Forbidden,
                Detail = "You do not have permission to access this resource.",
                Instance = context.Request.Path
            };
            problem.Extensions["traceId"] = context.HttpContext.TraceIdentifier;
            return context.Response.WriteAsJsonAsync(problem);
        };
    });

builder.Services.AddAuthorization();

// Servicios de autenticación y seguridad
builder.Services.AddScoped<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddSingleton<ILoginAttemptTracker, LoginAttemptTracker>();

// 4. Servicio de almacenamiento del volumen de imágenes (ADR-03, Épica E4)
string imagesPath;
if (Directory.Exists("/data/images"))
{
    imagesPath = "/data/images";
}
else
{
    var configured = builder.Configuration["STORAGE_IMAGES_PATH"]
                     ?? builder.Configuration["IMAGES_DIR"]
                     ?? builder.Configuration["Storage:ImagesPath"];

    if (!string.IsNullOrEmpty(configured) && Directory.Exists(configured))
    {
        imagesPath = Path.GetFullPath(configured);
    }
    else
    {
        var dir = new DirectoryInfo(builder.Environment.ContentRootPath);
        string? candidate = null;
        while (dir != null)
        {
            var testPath = Path.Combine(dir.FullName, "data", "images");
            if (Directory.Exists(testPath))
            {
                candidate = testPath;
                break;
            }
            dir = dir.Parent;
        }
        imagesPath = candidate ?? Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, configured ?? "data/images"));
    }
}

builder.Services.AddSingleton<IStorageService>(sp =>
{
    var logger = sp.GetRequiredService<ILogger<PhysicalStorageService>>();
    return new PhysicalStorageService(imagesPath, logger);
});

// 5. Cliente de inspección de imágenes hacia el servicio tiles (ADR-03, §12.8)
builder.Services.AddHttpContextAccessor();
builder.Services.AddTransient<TraceIdDelegatingHandler>();

var tilesServiceUrl = builder.Configuration["TILES_SERVICE_URL"] ?? "http://tiles:8000";
builder.Services.AddHttpClient<IImageInspector, TilesImageInspector>(client =>
{
    client.BaseAddress = new Uri(tilesServiceUrl);
    client.Timeout = TimeSpan.FromSeconds(10);
})
.AddHttpMessageHandler<TraceIdDelegatingHandler>();

// 6. Servicio de exportación a JSON interno (ADR-10, Épica E9)
builder.Services.AddScoped<IExporter, InternalJsonExporter>();
builder.Services.AddScoped<InternalJsonExporter>();

// 7. Manejo de Errores RFC 9457 con traceId y tipos URN (§8.5, §8.7)
builder.Services.AddExceptionHandler<GiaExceptionHandler>();
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = ctx =>
    {
        ctx.ProblemDetails.Extensions["traceId"] = ctx.HttpContext.TraceIdentifier;
        if (string.IsNullOrEmpty(ctx.ProblemDetails.Type) || ctx.ProblemDetails.Type.StartsWith("http", StringComparison.OrdinalIgnoreCase))
        {
            ctx.ProblemDetails.Type = GiaProblemTypes.ForStatus(ctx.ProblemDetails.Status ?? 500);
        }
    };
});

// 7. Controladores con validación estricta (additionalProperties: false) y formato RFC 9457
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.UnmappedMemberHandling = System.Text.Json.Serialization.JsonUnmappedMemberHandling.Disallow;
        options.JsonSerializerOptions.AllowOutOfOrderMetadataProperties = true;
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var traceId = context.HttpContext.TraceIdentifier;
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(err => err.ErrorMessage).ToArray()
                );

            var problem = new ProblemDetails
            {
                Type = GiaProblemTypes.Validation,
                Title = "Validation Problem",
                Status = StatusCodes.Status400BadRequest,
                Detail = "One or more validation errors occurred.",
                Instance = context.HttpContext.Request.Path
            };

            problem.Extensions["traceId"] = traceId;
            problem.Extensions["errors"] = errors;

            return new ObjectResult(problem)
            {
                StatusCode = StatusCodes.Status400BadRequest,
                ContentTypes = { "application/problem+json" }
            };
        };
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseTraceId(); // 1. Propaga y fija X-Request-ID (Gateway Nginx)
app.UseExceptionHandler(); // 2. Convierte excepciones no controladas a ProblemDetails con traceId
app.UseStatusCodePages(); // 3. Convierte códigos 4xx/5xx sin cuerpo a ProblemDetails estándar RFC 9457

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Inicialización de base de datos y creación de administrador inicial (ADR-04, §7.1)
await DatabaseInitializer.InitializeDatabaseAsync(app.Services);

await app.RunAsync();
