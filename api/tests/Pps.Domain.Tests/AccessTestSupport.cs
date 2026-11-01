namespace Pps.Domain.Tests;

using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Pps.Domain.Access;
using Pps.Infrastructure.Persistence;

/// <summary>Piezas comunes de las pruebas de autorización por proyecto: sesión simulada y base SQLite en memoria.</summary>
internal static class AccessTestSupport
{
    public static ClaimsPrincipal Principal(long userId, string username, string role)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Role, role)
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Cookie"));
    }

    public static void SetUser(ControllerBase controller, long userId, string username, string role)
    {
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = Principal(userId, username, role) }
        };
    }

    public static SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();
        return connection;
    }

    public static DbContextOptions<AppDbContext> Options(SqliteConnection connection) =>
        new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options;

    public static AppDbContext CreateDb(SqliteConnection connection)
    {
        var db = new AppDbContext(Options(connection));
        db.Database.EnsureCreated();
        return db;
    }

    public static string Wire(ProjectRole role) => ProjectRoles.ToWire(role);
}
