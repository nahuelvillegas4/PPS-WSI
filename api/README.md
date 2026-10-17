# Módulo API - Plataforma PPS 2

Backend implementado en **ASP.NET Core Web API** con persistencia en **PostgreSQL**.

---

## 🛠️ Stack Tecnológico Alineado

| Capa | Estado | Detalle |
|---|---|---|
| Lenguaje y framework | C# / .NET 10 LTS (ASP.NET Core Web API) | SDK 10.0.402 activo ([§2.4](../docs/arquitectura/01-introduccion-y-restricciones.md)) |
| Base de datos | PostgreSQL 18 estándar | Sin PostGIS ([ADR-07](../docs/adr/0007-modelo-de-datos-y-autoria.md)) |
| ORM y geometrías | EF Core 10.x (Npgsql 10.x) | Almacenamiento en `jsonb`, validaciones geométricas en API ([§8.2](../docs/arquitectura/04-despliegue-y-conceptos.md)) |
| Autenticación | Cookie `gia_session` | Con Data Protection persistido en `/keys` y PasswordHasher ([ADR-04](../docs/adr/0004-sesion-y-proteccion-de-teselas.md)) |
| Contenedores | Docker y Docker Compose | `compose.yaml` en la raíz del repositorio ([ADR-11](../docs/adr/0011-un-compose-dos-entornos.md)) |

---

## 📂 Estructura de la Solución

```text
api/
├── src/
│   ├── Pps.Domain/          # Entidades centrales de negocio (Proyectos, Datasets, Anotaciones, Clases)
│   ├── Pps.Infrastructure/  # DbContext, migraciones EF Core y acceso a PostgreSQL
│   └── Pps.Api/             # Controllers, configuración de autenticación, OpenAPI y contratos de integración
├── Dockerfile               # Multi-stage build para .NET
├── PpsPlatform.sln          # Solución .NET
└── .dockerignore            # Exclusiones de build Docker
```

Dentro de cada proyecto, las carpetas siguen los componentes de la API definidos en la [vista de bloques](../docs/arquitectura/03-bloques-y-ejecucion.md) (Auth, Catalog, Images, Annotations, Import, Export, TileAccess), y los formatos entran por interfaces. El contrato que debe cumplir la API está en [`contract/`](../contract/README.md).

---

## 🚀 Comandos Útiles

### Levantar todo con Docker Compose (desde la raíz):
```powershell
docker compose up -d --build
```

### Ejecutar localmente (para debugging rápido):
```powershell
# 1. Levantar solo la base de datos (desde la raíz):
docker compose up -d db

# 2. Ejecutar la API:
dotnet run --project api/src/Pps.Api
```

### Compilar la solución:
```powershell
dotnet build api/PpsPlatform.sln
```
