# Changelog del contrato

Formato basado en «Keep a Changelog». Hasta la 1.0 cualquier cambio sube la versión menor.

## [0.1.0] — 2026-09-28

### Agregado

- `openapi/api.v1.yaml`: autenticación, usuarios, proyectos, datasets, clases, archivos del volumen, imágenes, anotaciones con `ETag`/`If-Match`, importación con `dryRun`, exportación y `tile-access` interno.
- `openapi/tiles.v1.yaml`: DZI, teselas, inspección interna y salud.
- `schemas/geometry.schema.json` (rectángulo y polígono en nivel 0) y `schemas/internal-export.schema.json` (`gia-annotations` 1.x).
- Casos numéricos: `coordinates.json`, `dzi.json` (verificado con `DeepZoomGenerator`), `export.json` y `geometry-validation.json`.
- `scripts/check_contract.py` con la implementación de referencia de las reglas 422.
