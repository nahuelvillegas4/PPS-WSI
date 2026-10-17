# Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 2)

Backend para la gestión de proyectos, datasets médicos, interoperabilidad y ciclo de vida de anotaciones geométricas sobre Whole Slide Images (WSI) e imágenes convencionales.

---

## 🛠️ Stack Tecnológico

- **Lenguaje y Framework:** C# / .NET 8 (ASP.NET Core Web API).
- **Base de Datos:** PostgreSQL 16 con extensión espacial PostGIS.
- **ORM & Geometrías:** Entity Framework Core 8 con NetTopologySuite.
- **Autenticación:** JWT (Bearer Tokens) local con trazabilidad de autoría.
- **Contenedores:** Docker & Docker Compose (build multi-stage optimizado).

---

## 🚀 Inicio Rápido con Docker Compose

Requisitos: [Docker Desktop](https://www.docker.com/products/docker-desktop/) en ejecución.

1. Clonar el repositorio y situarse en la raíz:
   ```powershell
   cd c:\Users\nahue\Desktop\Facultad\PPS
   ```

2. Levantar la base de datos y la API:
   ```powershell
   docker compose up -d --build
   ```

3. Abrir la documentación interactiva Swagger:
   - **URL Swagger UI:** [http://localhost:8080/swagger](http://localhost:8080/swagger)

---

## 💻 Desarrollo Local (sin Docker para la API)

Si deseas debuggear la API localmente mientras la base de datos corre en Docker:

1. Levantar solo la base de datos:
   ```powershell
   docker compose up -d pps-db
   ```

2. Ejecutar la API en modo desarrollo:
   ```powershell
   dotnet run --project src/Pps.Api
   ```

---

## 📂 Estructura de la Solución

```text
├── src/
│   ├── Pps.Domain/          # Entidades centrales de negocio (Proyectos, Datasets, Anotaciones, Clases)
│   ├── Pps.Infrastructure/  # DbContext, migraciones EF Core, NetTopologySuite y PostgreSQL
│   └── Pps.Api/             # Controllers, configuración JWT, Swagger y contratos de integración
├── Dockerfile               # Multi-stage build para .NET 8
├── docker-compose.yml       # Orquestación de API + PostgreSQL/PostGIS
├── BITACORA_PPS2.md         # Registro formal de 40 días para la universidad
└── CONTRATO_INTEGRACION_PPS1_PPS2.md # Contrato técnico con el módulo de visor WSI (PPS 1)
```
