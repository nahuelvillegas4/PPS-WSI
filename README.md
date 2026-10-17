# Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 1 + PPS 2)

Proyecto de Práctica Profesional Supervisada para la gestión, anotación geométrica e interoperabilidad de datasets de imágenes médicas (WSI y microscopía convencional). Es un único producto con dos módulos evaluables por separado: la PPS 1 (visor, teselas y frontend) y la PPS 2 (API de gestión, persistencia, importación y exportación).

> **Línea base técnica.** Las decisiones acordadas están en [`docs/arquitectura/`](docs/arquitectura/README.md) y [`docs/adr/`](docs/adr/README.md); el contrato de integración normativo, en [`contract/`](contract/README.md). El scaffolding de la API se encuentra alineado con la arquitectura ([`docs/ALINEACION_SCAFFOLDING_PPS2.md`](docs/ALINEACION_SCAFFOLDING_PPS2.md)).

---

## 📁 Organización del Repositorio

| Carpeta / Archivo | Contenido | Estado |
|---|---|---|
| [`/api`](api) | Módulo API de la PPS 2 en ASP.NET Core, con Dockerfile, Cookie Auth (`gia_session`) y PostgreSQL | Alineado con la línea base |
| [`/docs`](docs) | Documentación del proyecto y requerimientos académicos (detalle abajo) | Vigente |
| [`/contract`](contract) | Contrato de integración versionado: OpenAPI, JSON Schema y casos numéricos | Vigente (v0.1.0) |
| [`/scripts`](scripts) | `check_contract.py`: verifica el contrato | Vigente |
| [`/tiles`](tiles/README.md) | Servicio de teselas Deep Zoom con OpenSlide (FastAPI), PPS 1 | Implementado: DZI, teselas e `inspect` |
| [`/web`](web/README.md) | Interfaz web (React + TypeScript + OpenSeadragon), PPS 1 | Visor de imágenes; sin ingreso ni anotaciones todavía |
| [`/deploy`](deploy/README.md) | Pasarela Nginx de origen único ([ADR-01](docs/adr/0001-spa-y-dos-servicios-tras-pasarela.md)) | Implementada y probada en contenedores (falta el camino con sesión válida) |
| `compose.yaml` | Orquestación Docker Compose en la raíz ([ADR-11](docs/adr/0011-un-compose-dos-entornos.md)) | `db`, `api`, `tiles` y `gateway` |
| `.env.example` | Plantilla de variables de entorno seguras | Configurado |

### Documentación en [`/docs`](docs)

- [`arquitectura/`](docs/arquitectura/README.md) y [`adr/`](docs/adr/README.md): arquitectura y línea base técnica (v0.9) con sus decisiones.
- [`PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf`](docs/PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf): requerimientos de PPS 1 (visor WSI con OpenSlide y OpenSeadragon).
- [`PPS_02_Gestion_Anotacion_Datasets (1).pdf`](docs/PPS_02_Gestion_Anotacion_Datasets%20%281%29.pdf): requerimientos de PPS 2 (backend de anotaciones y datasets).
- [`BITACORA_PPS1.md`](docs/BITACORA_PPS1.md) y [`BITACORA_PPS2.md`](docs/BITACORA_PPS2.md): registro diario de cada PPS para la universidad.
- [`CONTRATO_INTEGRACION_PPS1_PPS2.md`](docs/CONTRATO_INTEGRACION_PPS1_PPS2.md): propuesta inicial de integración, superada por [`contract/`](contract/README.md).
- [`ALINEACION_SCAFFOLDING_PPS2.md`](docs/ALINEACION_SCAFFOLDING_PPS2.md): seguimiento de diferencias resueltas del scaffolding.

---

## 🚀 Inicio Rápido

Con Docker Desktop abierto, desde la raíz del repositorio:

```powershell
# 1. Crear .env a partir de la plantilla (si no existe)
cp .env.example .env

# 2. Generar la imagen de prueba (queda en data/images/samples/, ignorada por Git)
python scripts/make_sample_image.py

# 3. Levantar todo. La variante «sin login» es temporal: la API todavía no tiene ingreso
docker compose -f compose.yaml -f compose.dev-sin-login.yaml up -d --build
```

- **Visor:** [http://localhost:8080/images/1](http://localhost:8080/images/1)
- **Swagger de la API** (solo desarrollo): [http://localhost:8081/swagger](http://localhost:8081/swagger)

El puerto 8080 es de la pasarela; la API pasó al 8081 para no chocar con ella. Detalles en [`deploy/README.md`](deploy/README.md).
