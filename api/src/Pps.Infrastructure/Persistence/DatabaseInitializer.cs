namespace Pps.Infrastructure.Persistence;

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pps.Domain.Auth;

public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<AppDbContext>>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();

        try
        {
            logger.LogInformation("Verificando y aplicando migraciones pendientes de PostgreSQL...");
            await db.Database.MigrateAsync();
            logger.LogInformation("Migraciones de PostgreSQL aplicadas correctamente.");

            // Crear administrador inicial si no existe (ADR-04, §7.1)
            var adminUsername = configuration["ADMIN_USERNAME"] ?? "admin";
            var adminPassword = configuration["ADMIN_PASSWORD"] ?? "gia_admin_password_change_me";

            var adminExists = await db.Users.AnyAsync(u => u.Username == adminUsername);
            if (!adminExists)
            {
                logger.LogInformation("Creando usuario administrador inicial: {Username}", adminUsername);
                var hasher = new PasswordHasher<User>();
                var adminUser = new User
                {
                    Username = adminUsername,
                    Role = "admin",
                    IsActive = true,
                    IsSystem = false,
                    CreatedAt = DateTime.UtcNow
                };
                adminUser.PasswordHash = hasher.HashPassword(adminUser, adminPassword);

                db.Users.Add(adminUser);
                await db.SaveChangesAsync();
                logger.LogInformation("Usuario administrador inicial creado con éxito.");
            }
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No se pudo conectar a la base de datos durante el inicio o no está lista aún. Se esperará a que el contenedor de PostgreSQL responda.");
        }
    }
}
