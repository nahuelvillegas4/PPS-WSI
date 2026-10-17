# Módulo Backend - Plataforma PPS 2

> **Estado: scaffolding inicial (17/10/2026).** Esta página describe lo que hay hoy en la carpeta. La línea base acordada difiere en la versión de .NET, la base de datos, la autenticación y el nombre de la carpeta (`api/`). Cada diferencia y su resolución están en [`docs/ALINEACION_SCAFFOLDING_PPS2.md`](../docs/ALINEACION_SCAFFOLDING_PPS2.md).

Backend implementado en **ASP.NET Core Web API** con persistencia en **PostgreSQL**.

---

## 🛠️ Stack Tecnológico

| Capa | Hoy (scaffolding) | Línea base ([decisión](../docs/ALINEACION_SCAFFOLDING_PPS2.md)) |
|---|---|---|
| Lenguaje y framework | C# / .NET 8 (ASP.NET Core Web API) | .NET 10 LTS ([§2.4](../docs/arquitectura/01-introduccion-y-restricciones.md)) |
| Base de datos | PostgreSQL 16 con PostGIS | PostgreSQL 18, sin PostGIS ([ADR-07](../docs/adr/0007-modelo-de-datos-y-autoria.md)) |
| ORM y geometrías | EF Core 8 con NetTopologySuite | EF Core 10; geometría en `jsonb` ([§8.2](../docs/arquitectura/04-despliegue-y-conceptos.md)) |
| Autenticación | JWT (Bearer) con trazabilidad de autoría | Cookie `gia_session` ([ADR-04](../docs/adr/0004-sesion-y-proteccion-de-teselas.md)); autor y fechas los pone el servidor |
| Contenedores | Docker y Docker Compose (build multi-stage) | Igual, dentro del Compose integrado ([ADR-11](../docs/adr/0011-un-compose-dos-entornos.md)) |

---

## 📂 Estructura de la Solución

```text
backend/
├── src/
│   ├── Pps.Domain/          # Entidades centrales de negocio (Proyectos, Datasets, Anotaciones, Clases)
│   ├── Pps.Infrastructure/  # DbContext, migraciones EF Core y acceso a PostgreSQL
│   └── Pps.Api/             # Controllers, configuración de autenticación, OpenAPI y contratos de integración
├── Dockerfile               # Multi-stage build para .NET
├── docker-compose.yml       # Orquestación de API + PostgreSQL
└── .dockerignore            # Exclusiones de build Docker
```

Dentro de cada proyecto, las carpetas siguen los componentes de la API definidos en la [vista de bloques](../docs/arquitectura/03-bloques-y-ejecucion.md) (Auth, Catalog, Images, Annotations, Import, Export, TileAccess), y los formatos entran por interfaces. El contrato que debe cumplir la API está en [`contract/`](../contract/README.md).

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
