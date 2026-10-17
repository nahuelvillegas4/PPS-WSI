# Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 1 + PPS 2)

Proyecto de Práctica Profesional Supervisada para la gestión, anotación geométrica e interoperabilidad de datasets de imágenes médicas (WSI y microscopía convencional). Es un único producto con dos módulos evaluables por separado: la PPS 1 (visor, teselas y frontend) y la PPS 2 (API de gestión, persistencia, importación y exportación).

> **Línea base técnica.** Las decisiones acordadas están en [`docs/arquitectura/`](docs/arquitectura/README.md) y [`docs/adr/`](docs/adr/README.md); el contrato de integración normativo, en [`contract/`](contract/README.md). El scaffolding actual de `backend/` difiere en algunos puntos: la lista y qué hacer con cada uno está en [`docs/ALINEACION_SCAFFOLDING_PPS2.md`](docs/ALINEACION_SCAFFOLDING_PPS2.md).

---

## 📁 Organización del Repositorio

| Carpeta | Contenido | Estado |
|---|---|---|
| [`/backend`](backend) | Scaffolding inicial de la API de la PPS 2 en .NET 8, con Dockerfile y docker-compose (PostgreSQL + PostGIS). La línea base lo define como `api/`, con .NET 10 y PostgreSQL 18 sin PostGIS | Se alinea en I0 |
| [`/docs`](docs) | Documentación del proyecto y requerimientos académicos (detalle abajo) | Vigente |
| [`/contract`](contract) | Contrato de integración versionado: OpenAPI, JSON Schema y casos numéricos | Vigente (v0.1.0) |
| [`/scripts`](scripts) | `check_contract.py`: verifica el contrato | Vigente |
| `tiles/`, `web/`, `deploy/`, `compose.yaml`, `.env.example` | Servicio de teselas, SPA, pasarela y Compose integrado ([ADR-13](docs/adr/0013-repositorio-unico.md)) | Se crean en I0 |

### Documentación en [`/docs`](docs)

- [`arquitectura/`](docs/arquitectura/README.md) y [`adr/`](docs/adr/README.md): arquitectura y línea base técnica (v0.9) con sus decisiones.
- [`PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf`](docs/PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf): requerimientos de PPS 1 (visor WSI con OpenSlide y OpenSeadragon).
- [`PPS_02_Gestion_Anotacion_Datasets (1).pdf`](docs/PPS_02_Gestion_Anotacion_Datasets%20%281%29.pdf): requerimientos de PPS 2 (backend de anotaciones y datasets).
- [`BITACORA_PPS1.md`](docs/BITACORA_PPS1.md) y [`BITACORA_PPS2.md`](docs/BITACORA_PPS2.md): registro diario de cada PPS para la universidad.
- [`CONTRATO_INTEGRACION_PPS1_PPS2.md`](docs/CONTRATO_INTEGRACION_PPS1_PPS2.md): propuesta inicial de integración, superada por [`contract/`](contract/README.md).
- [`ALINEACION_SCAFFOLDING_PPS2.md`](docs/ALINEACION_SCAFFOLDING_PPS2.md): diferencias entre el scaffolding y la línea base.

---

## 🚀 Inicio Rápido (Backend)

Por ahora solo existe el Compose de la API sola; el Compose integrado llega en I0. Para levantar el backend con PostgreSQL y PostGIS:

```powershell
cd backend
docker compose up -d --build
```

Documentación interactiva Swagger: [http://localhost:8080/swagger](http://localhost:8080/swagger)
