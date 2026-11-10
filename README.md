# Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 1 + PPS 2)

Proyecto de Práctica Profesional Supervisada para la gestión, anotación geométrica e interoperabilidad de datasets de imágenes médicas (WSI y microscopía convencional). Es un único producto con dos módulos evaluables por separado: la PPS 1 (visor, teselas y frontend) y la PPS 2 (API de gestión, persistencia, importación y exportación).

> **Línea base técnica.** Las decisiones acordadas están en [`docs/arquitectura/`](docs/arquitectura/README.md) y [`docs/adr/`](docs/adr/README.md); el contrato de integración normativo, en [`contract/`](contract/README.md). Los manuales de despliegue y operación se encuentran en [`docs/manuales/`](docs/manuales/README.md).

---

## 📂 Organización del Repositorio

| Carpeta / Archivo | Contenido | Estado |
|---|---|---|
| [`/api`](api/README.md) | Módulo API de la PPS 2 en ASP.NET Core, con Dockerfile, Cookie Auth (`gia_session`), membresías por proyecto y PostgreSQL | Completado y congelado (I4) |
| [`/docs`](docs/README.md) | Documentación del proyecto, manuales operativos, bitácoras y requerimientos académicos | Vigente y con manuales I4 |
| [`/contract`](contract/README.md) | Contrato de integración versionado: OpenAPI 3.0, JSON Schema y matriz de autorización | Vigente (v0.2.0) |
| [`/scripts`](scripts) | Scripts de verificación contractual, ensayos de aceptación integral y benchmarks | Vigente |
| [`/tiles`](tiles/README.md) | Servicio de teselas Deep Zoom con OpenSlide (FastAPI), PPS 1 | Implementado: DZI, teselas e `inspect` |
| [`/web`](web/README.md) | Interfaz web (React 19 + TypeScript): catálogo, miembros, usuarios, subida, guía `/gia` y visor WSI | Operativo con sesión real |
| [`/deploy`](deploy/README.md) | Pasarela Nginx de origen único ([ADR-0001](docs/adr/0001-spa-y-dos-servicios-tras-pasarela.md)) con `auth_request` | Implementada y validada |
| `compose.yaml` | Orquestación Docker Compose en la raíz ([ADR-0011](docs/adr/0011-un-compose-dos-entornos.md)) | `db`, `api`, `tiles`, `web` y `gateway` |
| `.env.example` | Plantilla de variables de entorno seguras | Configurado |

### Documentación en [`/docs`](docs)

- [`manuales/`](docs/manuales/README.md): **Manuales operativos de despliegue, importación CRIC, exportación COCO y guion de aceptación de la PPS 2.**
- [`arquitectura/`](docs/arquitectura/README.md) y [`adr/`](docs/adr/README.md): arquitectura y línea base técnica con sus 17 decisiones (ADRs).
- [`BITACORA_PPS2.md`](docs/BITACORA_PPS2.md): registro de horas y actividades diarias de la PPS 2 (Nahuel).
- [`BITACORA_PPS1.md`](docs/BITACORA_PPS1.md): registro de horas y actividades diarias de la PPS 1 (Gino).
- [`PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf`](docs/PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf): requerimientos de PPS 1 (visor WSI con OpenSlide y OpenSeadragon).
- [`PPS_02_Gestion_Anotacion_Datasets (1).pdf`](docs/PPS_02_Gestion_Anotacion_Datasets%20%281%29.pdf): requerimientos de PPS 2 (backend de anotaciones y datasets).

---

## 🚀 Inicio Rápido

Con Docker Desktop abierto, desde la raíz del repositorio:

```powershell
# 1. Crear .env a partir de la plantilla (si no existe)
cp .env.example .env

# 2. Generar imagen de prueba sintética (queda en data/images/samples/)
python scripts/make_sample_image.py

# 3. Levantar la plataforma completa
docker compose up -d --build
```

### Accesos directos:
- **Plataforma Web (SPA):** [http://localhost:8080](http://localhost:8080)
  - **Usuario administrador semilla:** `admin@gia.local`
  - **Contraseña:** `admin123`
- **Guía interactiva del sistema:** [http://localhost:8080/gia](http://localhost:8080/gia)
- **Swagger / OpenAPI:** [http://localhost:8081/swagger](http://localhost:8081/swagger)
- **Visor WSI:** [http://localhost:8080/images/1](http://localhost:8080/images/1)

---

## 🧪 Pruebas Automatizadas

- **Suite de pruebas unitarias y de dominio (.NET):**
  ```powershell
  dotnet test api/tests/Pps.Domain.Tests
  ```
- **Guion de aceptación de punta a punta (PPS 2 §7):**
  ```powershell
  python scripts/test_acceptance_i3.py
  ```
- **Verificación de contrato de integración:**
  ```powershell
  python scripts/check_contract.py
  ```
