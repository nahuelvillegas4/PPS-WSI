# Manual Operativo: Despliegue y Administración con Docker Compose

**Proyecto:** Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 1 + PPS 2)  
**Módulo:** Infraestructura, Despliegue y Operación (Épicas E1 y E10 — Incremento I4)  
**Audiencia:** Administradores de sistemas, desarrolladores e investigadores del laboratorio.

---

## 1. Arquitectura de Despliegue

El sistema se ejecuta como un conjunto de servicios contenerizados sobre **Docker & Docker Compose**, coordinados mediante una pasarela de entrada única basada en **Nginx** ([ADR-0001](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/adr/0001-spa-y-dos-servicios-tras-pasarela.md), [ADR-0011](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/adr/0011-un-compose-dos-entornos.md)):

```
                             [ Navegador Web ]
                                     │
                             (HTTP Puerto 8080)
                                     ▼
                      ┌─────────────────────────────┐
                      │    gia-gateway (Nginx)      │
                      └──────┬───────────────┬──────┘
                             │               │
            ┌────────────────┴──────┐        │ /tiles/*
            │ /api/*, /swagger, /   │        │ (con auth_request a API)
            ▼                       ▼        ▼
┌────────────────────────┐  ┌──────────────┐  ┌───────────────────────┐
│     gia-web (SPA)      │  │ gia-api      │  │ gia-tiles (FastAPI)   │
│  React 19 + TypeScript │  │ ASP.NET 10   │  │ Python 3.13 +         │
│  (Nginx Alpine)        │  │ LTS          │  │ OpenSlide             │
└────────────────────────┘  └───────┬──────┘  └───────────┬───────────┘
                                    │                     │
                             ┌──────┴──────┐       ┌──────┴──────┐
                             ▼             ▼       ▼             ▼
                      ┌────────────┐ ┌────────────────────────────────┐
                      │   gia-db   │ │  data/ (Volumen compartido)    │
                      │ PostgreSQL │ │  - images/ (WSI .svs, JPG/PNG) │
                      │ 18         │ │  - keys/ (Data Protection)     │
                      └────────────┘ └────────────────────────────────┘
```

### Servicios del stack (`compose.yaml`):

| Contenedor | Imagen / Base | Rol | Puerto interno |
|---|---|---|---|
| `gia-gateway` | `nginx:alpine` | Punto único de entrada, enrutamiento y proxy `auth_request` | `8080` (expuesto al host) |
| `gia-web` | Node 24 -> Nginx | Frontend SPA React, visor OpenSeadragon, catálogo y guía `/gia` | `80` (interno) |
| `gia-api` | .NET 10 LTS (SDK/Runtime) | Backend API de gestión, catálogos, persistencia, importación/exportación | `5000` (interno), `8081` (dev) |
| `gia-tiles` | Python 3.13-slim | Servidor de teselas Deep Zoom (DZI) con OpenSlide nativo | `8000` (interno), `8082` (dev) |
| `gia-db` | `postgres:18-alpine` | Base de datos relacional para usuarios, proyectos, clases y anotaciones | `5432` (interno) |

---

## 2. Requisitos Previos

- **Docker Desktop** (en Windows/macOS) o **Docker Engine + Docker Compose v2** (en Linux).
- Mínimo **4 GB de memoria RAM** asignados al motor de Docker (recomendado 8 GB para procesamiento fluido de imágenes WSI pesadas).
- **Espacio en disco:** Al menos 10 GB disponibles para imágenes de prueba y almacenamiento de base de datos.
- Puertos del host libres:
  - `8080`: Puerto principal de la aplicación.
  - `8081` y `8082`: Puertos opcionales de desarrollo (Swagger y servidor de teselas directo).

---

## 3. Configuración Inicial del Entorno

### 3.1 Creación del archivo `.env`

Desde la raíz del repositorio, copie el archivo de ejemplo:

```bash
cp .env.example .env
```

### 3.2 Variables de Configuración

Edite el archivo `.env` según las necesidades del entorno:

```ini
# Base de datos PostgreSQL
POSTGRES_DB=gia
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_dev_password

# Cadena de conexión para la API
ConnectionStrings__DefaultConnection=Host=db;Port=5432;Database=gia;Username=postgres;Password=postgres_dev_password

# Rutas de almacenamiento en el host
DATA_PATH=./data
IMAGES_PATH=./data/images
KEYS_PATH=./data/keys

# Usuario Administrador Inicial (semilla automática)
SEED_ADMIN_EMAIL=admin@gia.local
SEED_ADMIN_PASSWORD=admin123
```

> [!IMPORTANT]
> En entornos de laboratorio o producción, cambie `POSTGRES_PASSWORD` y `SEED_ADMIN_PASSWORD` por contraseñas seguras antes de iniciar los contenedores.

---

## 4. Procedimiento de Arranque y Despliegue

### 4.1 Generación de imágenes de muestra (Opcional)

Si no dispone de imágenes médicas previas en `data/images/`, genere una imagen de prueba convencional para validar el stack:

```bash
python scripts/make_sample_image.py
```

### 4.2 Levantamiento del Sistema Completo

Para compilar y levantar todos los servicios en segundo plano:

```bash
docker compose up -d --build
```

### 4.3 Verificación del Estado de los Contenedores

```bash
docker compose ps
```

Todos los servicios deben encontrarse en estado `Up` o `healthy`:
```
NAME          IMAGE           COMMAND                  SERVICE   STATUS              PORTS
gia-gateway   nginx:alpine    "/docker-entrypoint.…"   gateway   Up                  0.0.0.0:8080->8080/tcp
gia-web       gia-web         "/docker-entrypoint.…"   web       Up                  80/tcp
gia-api       gia-api         "dotnet Pps.Api.dll"     api       Up                  0.0.0.0:8081->5000/tcp
gia-tiles     gia-tiles       "uvicorn main:app …"     tiles     Up                  0.0.0.0:8082->8000/tcp
gia-db        postgres:18     "docker-entrypoint.s…"   db        Up (healthy)        5432/tcp
```

### 4.4 Acceso Inicial

Abra su navegador web en:
- **Plataforma Web (SPA):** [http://localhost:8080](http://localhost:8080)
- **Credenciales por defecto:**
  - **Email:** `admin@gia.local` (o el configurado en `SEED_ADMIN_EMAIL`)
  - **Contraseña:** `admin123` (o la configurada en `SEED_ADMIN_PASSWORD`)
- **Documentación Swagger / OpenAPI:** [http://localhost:8081/swagger](http://localhost:8081/swagger)
- **Guía Interactiva del Sistema:** [http://localhost:8080/gia](http://localhost:8080/gia)

---

## 5. Migraciones y Persistencia de Datos

### 5.1 Inicialización Automática de Base de Datos
Al arrancar, `gia-api` ejecuta automáticamente `DatabaseInitializer`:
1. Aplica las migraciones pendientes de Entity Framework Core (`AppDbContext.Database.Migrate()`).
2. Crea el usuario administrador semilla si la tabla de usuarios está vacía.
3. Genera el usuario de sistema `import-cric` (`IsSystem = true`) requerido para trazabilidad de importaciones.

### 5.2 Claves de Sesión (Data Protection)
Las cookies de autenticación `gia_session` son firmadas criptográficamente. Las claves de cifrado se almacenan de forma persistente en el volumen montado en `/keys` (`./data/keys` en el host). Esto permite reiniciar o actualizar el contenedor `gia-api` sin invalidar las sesiones activas de los usuarios ([ADR-0004](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/adr/0004-sesion-y-proteccion-de-teselas.md)).

---

## 6. Mantenimiento y Operaciones Comunes

### 6.1 Detener el Sistema
```bash
docker compose down
```

### 6.2 Reiniciar Limpiando Volúmenes (¡Borrado completo de datos!)
Si desea reiniciar el entorno desde cero descartando datos y tablas:
```bash
docker compose down -v
```

### 6.3 Consulta de Logs en Tiempo Real
- Ver logs de todos los servicios:
  ```bash
  docker compose logs -f
  ```
- Ver logs exclusivos de la API:
  ```bash
  docker compose logs -f api
  ```
- Ver logs del servidor de teselas:
  ```bash
  docker compose logs -f tiles
  ```

### 6.4 Respaldo y Restauración de Base de Datos
- **Copia de seguridad (Dump):**
  ```bash
  docker compose exec -T db pg_dump -U postgres gia > backup_gia_$(date +%Y%m%d).sql
  ```
- **Restauración:**
  ```bash
  docker compose exec -T db psql -U postgres -d gia < backup_gia_YYYYMMDD.sql
  ```
