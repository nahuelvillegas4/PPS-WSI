# Módulo Backend - Plataforma PPS 2

Backend implementado en **ASP.NET Core 8 Web API** con persistencia espacial en **PostgreSQL 16 + PostGIS**.

---

## 🛠️ Stack Tecnológico

- **Lenguaje & Framework:** C# / .NET 8 (ASP.NET Core Web API).
- **Base de Datos:** PostgreSQL 16 con extensión espacial PostGIS.
- **ORM & Geometrías:** Entity Framework Core 8 con NetTopologySuite.
- **Autenticación:** JWT (Bearer tokens) local con trazabilidad de autoría.
- **Contenedores:** Docker & Docker Compose (build multi-stage optimizado).

---

## 📂 Estructura de la Solución

```text
backend/
├── src/
│   ├── Pps.Domain/          # Entidades centrales de negocio (Proyectos, Datasets, Anotaciones, Clases)
│   ├── Pps.Infrastructure/  # DbContext, migraciones EF Core, NetTopologySuite y PostgreSQL
│   └── Pps.Api/             # Controllers, configuración JWT, Swagger y contratos de integración
├── Dockerfile               # Multi-stage build para .NET 8
├── docker-compose.yml       # Orquestación de API + PostgreSQL/PostGIS
└── .dockerignore            # Exclusiones de build Docker
```

---

## 🚀 Comandos Útiles

### Levantar todo con Docker Compose:
```powershell
docker compose up -d --build
```

### Ejecutar localmente (para debugging rápido):
```powershell
# 1. Levantar solo la base de datos:
docker compose up -d pps-db

# 2. Ejecutar la API:
dotnet run --project src/Pps.Api
```

### Compilar la solución:
```powershell
dotnet build
```
