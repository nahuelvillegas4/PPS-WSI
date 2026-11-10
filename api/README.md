# Módulo API - Plataforma PPS 2

Backend implementado en **ASP.NET Core Web API** con persistencia en **PostgreSQL 18**, soporte de Whole Slide Images (WSI), autorización granular por proyecto y módulos de importación/exportación de datasets.

---

## 🛠️ Stack Tecnológico Alineado

| Capa | Estado | Detalle |
|---|---|---|
| Lenguaje y framework | C# / .NET 10 LTS (ASP.NET Core Web API) | SDK 10.0.402 activo ([§2.4](../docs/arquitectura/01-introduccion-y-restricciones.md)) |
| Base de datos | PostgreSQL 18 estándar | Almacenamiento en `jsonb` sin PostGIS ([ADR-0007](../docs/adr/0007-modelo-de-datos-y-autoria.md)) |
| ORM y geometrías | EF Core 10.x (Npgsql 10.x) | Validaciones geométricas en API en coordenadas de nivel 0 ([§8.2](../docs/arquitectura/04-despliegue-y-conceptos.md)) |
| Autenticación | Cookie `gia_session` | Con Data Protection persistido en `/keys` y PasswordHasher ([ADR-0004](../docs/adr/0004-sesion-y-proteccion-de-teselas.md)) |
| Autorización | Roles globales y de proyecto | Matriz de 40 operaciones con `AccessGuardFilter` que falla cerrado ([ADR-0015](../docs/adr/0015-roles-por-proyecto-y-membresia.md), [ADR-0016](../docs/adr/0016-autorizacion-por-proyecto-y-sesion.md)) |
| Importación / Exportación | CRIC y COCO | Formato interno `gia-annotations` v1.0 y COCO Object Detection ([ADR-0009](../docs/adr/0009-importacion-por-adaptadores.md), [ADR-0010](../docs/adr/0010-exportacion.md)) |
| Contenedores | Docker y Docker Compose | `compose.yaml` en la raíz del repositorio ([ADR-0011](../docs/adr/0011-un-compose-dos-entornos.md)) |

---

## 📂 Estructura de la Solución

```text
api/
├── src/
│   ├── Pps.Domain/          # Entidades centrales de negocio, modelos espaciales, reglas de acceso e interfaces
│   ├── Pps.Infrastructure/  # DbContext, migraciones EF Core, adaptadores de acceso y CricImporter
│   └── Pps.Api/             # Controladores REST, filtros de acción globales (AccessGuardFilter), y manejo RFC 9457
├── tests/
│   └── Pps.Domain.Tests/    # Suite de 292 pruebas xUnit (ciclo de vida, concurrencia, acceso, WSI, import/export)
├── Dockerfile               # Multi-stage build para .NET 10
├── PpsPlatform.sln          # Solución .NET
└── .dockerignore            # Exclusiones de build Docker
```

Dentro de cada proyecto, las carpetas siguen los componentes de la API definidos en la [vista de bloques](../docs/arquitectura/03-bloques-y-ejecucion.md) (`Auth`, `Catalog`, `Images`, `Annotations`, `Members`, `Storage`, `IO`, `TileAccess`, `Users`), y los formatos entran por interfaces desacopladas. El contrato que cumple la API está en [`contract/`](../contract/README.md).

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

### Compilar y correr pruebas unitarias:
```powershell
# Compilar la solución
dotnet build api/PpsPlatform.sln

# Ejecutar las 292 pruebas automatizadas
dotnet test api/tests/Pps.Domain.Tests
```
