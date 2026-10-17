# Anexo A. Contrato de integración v0.1.0

Este anexo es la versión legible del contrato. Los archivos de `contract/` son la versión normativa y verificable: si este texto y un archivo difieren, manda el archivo y se corrige el texto. La parte de frontend del contrato, la interfaz `ImageViewer` que pide PPS 2 §4, está en §5.2.

## A.1 Qué contiene

| Archivo | Qué define | Dueño |
|---|---|---|
| `openapi/api.v1.yaml` | Endpoints, cuerpos, errores y seguridad de la API | PPS 2, revisa PPS 1 |
| `openapi/tiles.v1.yaml` | DZI, teselas, inspección interna y salud | PPS 1, revisa PPS 2 |
| `schemas/geometry.schema.json` | Rectángulo y polígono en nivel 0 | Ambos |
| `schemas/internal-export.schema.json` | Formato JSON interno de exportación | PPS 2, revisa PPS 1 |
| `fixtures/coordinates.json` | Casos pantalla ↔ nivel 0 | PPS 1 |
| `fixtures/dzi.json` | Direccionamiento Deep Zoom verificado con OpenSlide | PPS 1 |
| `fixtures/export.json` | Casos de COCO, YOLO, WSI y puntos de CRIC | PPS 2 |
| `fixtures/geometry-validation.json` | Geometrías válidas e inválidas (400 y 422) | Ambos |
| `scripts/check_contract.py` (raíz del repositorio) | Verifica todo lo anterior en la CI | Ambos |

## A.2 Versión y reglas de cambio

- Versión **0.1.0**. Hasta la 1.0, que se congela al cierre de I2, cualquier cambio sube la versión menor y se anuncia en `CHANGELOG.md`.
- Desde la 1.0 se aplica versionado semántico. Es **compatible** agregar endpoints, parámetros opcionales o campos opcionales en las respuestas, y sube la versión menor. Es **incompatible** quitar o renombrar, volver obligatorio algo opcional o cambiar un significado: sube la versión mayor y conviven `/v1` y `/v2` hasta que migren los dos módulos.
- Todo cambio es un PR que toca `contract/`, actualiza el CHANGELOG y los casos numéricos afectados y tiene la aprobación de los dos.

## A.3 Sistema de coordenadas (normativo)

Píxeles de nivel 0 con decimales; origen en la esquina superior izquierda; x hacia la derecha, y hacia abajo; la imagen ocupa [0, W] × [0, H]. El DZI se genera con `limit_bounds=False`, de modo que sus dimensiones son las del nivel 0.

Conversión que implementa el adaptador del visor. El viewport de OpenSeadragon se normaliza por el **ancho** W en ambos ejes. Con un elemento del visor de vw × vh px y una vista con límites (bx, by, bw, bh) en unidades de viewport:

```text
pantalla → nivel 0:   x0 = (bx + sx · bw / vw) · W        y0 = (by + sy · bh / vh) · W
nivel 0 → pantalla:   sx = (x0 / W − bx) · vw / bw        sy = (y0 / W − by) · vh / bh
escala:               px de nivel 0 por px de pantalla = bw · W / vw
```

| Caso | Imagen · vista | Pantalla → nivel 0 | Trampa que detecta |
|---|---|---|---|
| C1 | 100.000 × 80.000 · x ∈ [0,30; 0,35], y ∈ [0,20; 0,24] · 5 px/px | (400, 300) → (32.000, 21.500); (1.000, 800) → (35.000, 24.000); (0, 0) → (30.000, 20.000) | y por el alto da 17.200; coordenadas del nivel 1 del SVS dan (8.000, 5.375) |
| C2 | Misma WSI con zoom ×2: x ∈ [0,3125; 0,3375], y ∈ [0,21; 0,23] · 2,5 px/px | (400, 300) → (32.250, 21.750) | La escala cambia; la geometría guardada no |
| C3 | 1.376 × 1.020 (tamaño CRIC), ajustada al ancho: y ∈ [−0,02936; 0,77064] · 1,376 px/px | (500, 400) → (688, 510); (250, 100) → (344; 97,2); (0, 0) → (0; −40,4), fuera de la imagen | y por el alto da 72,05 en lugar de 97,2 |

**Ida y vuelta.** El rectángulo guardado `(32.000, 21.500, 500, 400)` se dibuja en pantalla en (400, 300) con 100 × 80 px en la vista C1, y en (300, 200) con 200 × 160 px en la vista C2. Tolerancia de los casos: 1e-6 px de nivel 0.

## A.4 Geometrías

```json
{ "type": "rectangle", "x": 600, "y": 390, "width": 100, "height": 100 }
{ "type": "polygon", "points": [[10, 10], [110, 10], [60, 90]] }
```

Si hay más de un error, la API informa el primero según este orden:

| Orden | Regla | Respuesta | `type` |
|---|---|---|---|
| 1 | Forma según el esquema: tipos, campos obligatorios, sin propiedades extra, coordenadas ≥ 0, ancho y alto > 0, de 3 a 10.000 vértices, puntos de exactamente dos números | 400 | `urn:gia:problem:validation` |
| 2 | La clase pertenece al dataset de la imagen | 422 | `urn:gia:problem:class-not-in-dataset` |
| 3 | Dentro de la imagen: x + width ≤ W, y + height ≤ H y cada vértice en [0, W] × [0, H] | 422 | `urn:gia:problem:geometry-out-of-bounds` |
| 4 | Sin cierre explícito (el último vértice no repite el primero) ni vértices consecutivos repetidos | 422 | `urn:gia:problem:geometry-degenerate` |
| 5 | Polígono simple: ninguna arista cruza a otra no adyacente | 422 | `urn:gia:problem:geometry-self-intersection` |
| 6 | Área mayor que cero | 422 | `urn:gia:problem:geometry-degenerate` |

La autointersección se evalúa antes que el área porque un polígono en forma de moño simétrico tiene área con signo cero: con el orden inverso se informaría como «degenerado». `fixtures/geometry-validation.json` trae 4 casos válidos, 7 de error 400 (G-400-1 a G-400-7) y 6 de error 422 (G-422-1 a G-422-6); `check_contract.py` incluye una implementación de referencia de estas reglas que la API debe reproducir.

**Nota sobre herramientas (verificada).** Los puntos se declaran como «arreglo de exactamente dos números» (`minItems`/`maxItems`) y no como tupla, y el esquema no usa `$defs`. Con tuplas, openapi-fetch 0.17 las convierte en arreglos genéricos al tipar cuerpos y respuestas; con `$defs`, openapi-typescript 7.13 genera un tipo que exige una propiedad `$defs`. Así escrito, el tipo generado es una unión discriminada limpia: `rectangle | polygon`.

## A.5 API v0.1 (resumen de `api.v1.yaml`)

Lectura: cualquier sesión. Escritura del catálogo, registro, importación y usuarios: administración. Modificación de anotaciones: solo su autor.

| Método y ruta | Éxito | Errores relevantes |
|---|---|---|
| `POST /api/v1/auth/login` · `POST /api/v1/auth/logout` · `GET /api/v1/auth/me` | 204 con cookie · 204 · 200 | 400, 401, 429 |
| `GET, POST /api/v1/users` · `PATCH /api/v1/users/{userId}` | 200, 201 | 403, 409 |
| `GET, POST /api/v1/projects` · `GET, PATCH, DELETE /api/v1/projects/{projectId}` | 200, 201, 204 | 404, 409 `not-empty` |
| `GET, POST /api/v1/projects/{projectId}/datasets` · `GET, PATCH, DELETE /api/v1/datasets/{datasetId}` | 200, 201, 204 | 404, 409 |
| `GET, POST /api/v1/datasets/{datasetId}/classes` · `PATCH, DELETE /api/v1/classes/{classId}` | 200, 201, 204 | 409 `duplicate-name`, `class-in-use` |
| `GET /api/v1/storage/files?prefix=` | 200 | 403, 422 `invalid-storage-key` |
| `GET, POST /api/v1/datasets/{datasetId}/images` | 200 paginado, 201 | 409 `already-registered`, 422, 503 |
| `GET /api/v1/images/{imageId}` | 200, incluye `tileSourceUrl` | 404 |
| `GET, POST /api/v1/images/{imageId}/annotations` | 200, 201 con `ETag` | 400, 422 |
| `GET, PATCH, DELETE /api/v1/annotations/{annotationId}` | 200, 204 | 403, 412, 428 |
| `POST /api/v1/datasets/{datasetId}/imports` | 200 (`dryRun`), 201 | 409 `already-imported`, 422, 503 |
| `GET /api/v1/datasets/{datasetId}/export?format=&authors=` | 200 con archivo adjunto | 400, 422 |
| `GET /internal/v1/tile-access` (solo la pasarela) | 204 con `X-Storage-Key` | 401, 403 |

## A.6 Servicio de teselas v0.1 (resumen de `tiles.v1.yaml`)

| Método y ruta | Quién lo llama | Éxito | Errores |
|---|---|---|---|
| `GET /tiles/v1/images/{imageId}.dzi` | Navegador, a través de la pasarela | 200 `application/xml` | 400 `missing-storage-key`, 404 `file-not-found`, 422 `invalid-storage-key` |
| `GET /tiles/v1/images/{imageId}_files/{level}/{col}_{row}.jpeg` | Navegador, a través de la pasarela | 200 `image/jpeg`, `Cache-Control: private, max-age=86400` | 404 `tile-not-found` |
| `GET /internal/v1/inspect?storageKey=` | Solo la API | 200 con metadatos por lista blanca | 404, 415 `unsupported-image-format`, 422 |
| `GET /health/live` · `GET /health/ready` | Docker Compose | 200 | 503 |

Parámetros Deep Zoom: `tile_size=254`, `overlap=1`, `limit_bounds=False`, JPEG. Casos verificados con `DeepZoomGenerator` (openslide-python 1.4.6, OpenSlide 4.0.1):

| Caso | Imagen | Resultado |
|---|---|---|
| D1 | WSI simulada 100.000 × 80.000, downsamples 1, 4 y 16 | 18 niveles (0 a 17); nivel 17: 394 × 315 teselas; nivel 15: 25.000 × 20.000 px en 99 × 79 teselas; 165.747 teselas en total. El punto (32.000, 21.500) cae en `15/31_21`, que se lee desde (31.492, 21.332) de nivel 0, en el nivel 1 del SVS, 256 × 256 px |
| D2 | PNG de 1.376 × 1.020 (`ImageSlide`) | 12 niveles (0 a 11); nivel 11: 6 × 5 teselas; nivel 10: 688 × 510 px en 3 × 3; 52 teselas; la última, `11/5_4`, mide 107 × 5 px |

## A.7 Catálogo de errores

Todas las respuestas de error usan `application/problem+json` (RFC 9457) con `type`, `title`, `status` y `traceId`; los 400 agregan `errors`.

```json
{
  "type": "urn:gia:problem:geometry-out-of-bounds",
  "title": "La geometría excede los límites de la imagen",
  "status": 422,
  "detail": "El vértice 3 (20, 1020.5) cae fuera de [0, 1376] × [0, 1020].",
  "instance": "/api/v1/images/7/annotations",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736"
}
```

| Estado | `type` (`urn:gia:problem:…`) | Cuándo |
|---|---|---|
| 400 | `validation` · `missing-storage-key` | El JSON no cumple el esquema · la pasarela no envió la clave (configuración) |
| 401 | `unauthenticated` | Sin sesión o sesión vencida |
| 403 | `forbidden` | Rol insuficiente o anotación ajena |
| 404 | `not-found` · `file-not-found` · `tile-not-found` | Recurso, archivo o tesela inexistente |
| 409 | `duplicate-name` · `class-in-use` · `not-empty` · `already-registered` · `already-imported` | Conflicto con el estado actual |
| 412 | `version-mismatch` | `If-Match` no coincide con la versión vigente |
| 415 | `unsupported-media-type` · `unsupported-image-format` | Cuerpo que no es JSON · archivo de imagen no soportado (inspección) |
| 422 | `class-not-in-dataset` · `geometry-out-of-bounds` · `geometry-degenerate` · `geometry-self-intersection` · `invalid-storage-key` · `unsupported-image-format` · `import-too-large` | Regla de dominio |
| 428 | `precondition-required` | `PATCH` sin `If-Match` |
| 429 | `too-many-requests` | Demasiados intentos de ingreso |
| 500 | `internal` | Error inesperado; solo expone el `traceId` |
| 503 | `dependency-unavailable` | El servicio de teselas no respondió durante un registro o una importación |

## A.8 Casos de exportación

Imagen `cric/0001.png` de 1.376 × 1.020 px; clases 11 a 16 (NILM, ASC-US, LSIL, ASC-H, HSIL, SCC) con `displayOrder` 0 a 5.

| Anotación | COCO | YOLO (detección) |
|---|---|---|
| Rectángulo (600, 390, 100, 100), clase HSIL (15) | `bbox [600, 390, 100, 100]`, `area 10000`, `category_id 15` | `4 0.472384 0.431373 0.072674 0.098039` |
| Polígono (10, 10), (110, 10), (60, 90), clase LSIL (13) | `bbox [10, 10, 100, 80]`, `area 4000`, `segmentation [[10, 10, 110, 10, 60, 90]]` | `2 0.043605 0.049020 0.072674 0.078431` |
| Rectángulo (32.000, 21.500, 500, 400) en una WSI de 100.000 × 80.000 | `bbox [32000, 21500, 500, 400]`, `area 200000`, imagen completa en nivel 0 | — (YOLO solo para imágenes convencionales) |

Puntos de CRIC con `boxSize` = 100: el núcleo (650, 440) da la caja (600, 390, 100, 100); el núcleo (30, 1000) da (0, 950, 80, 70), recortada a la imagen. El archivo también trae un ejemplo completo de JSON interno que la CI valida contra su esquema.

## A.9 Cómo se verifica

```bash
pip install jsonschema pyyaml openapi-spec-validator openslide-python openslide-bin
python scripts/check_contract.py
npx openapi-typescript contract/openapi/api.v1.yaml -o web/src/shared/api/api.d.ts
```

Resultado al 28/09/2026: el script verifica esquemas, reglas de geometría, coordenadas, exportación, DZI (con `DeepZoomGenerator`) y las dos OpenAPI. Los tipos generados con openapi-typescript 7.13.0 compilan con TypeScript 5.9.3 en modo estricto junto con openapi-fetch 0.17.0. El compilador rechaza enviar `authorId` en el cuerpo, un rectángulo sin `height` y un `PATCH` sin `If-Match`.

## A.10 Pendiente para la versión 1.0

- Formato exacto del archivo de clasificaciones de CRIC y su mapeo de clases (`VERIFICAR` al descargarlo).
- `boxSize` definitivo (S5), formato externo (S7) y exportación de WSI (S8).
- Comparación semántica entre la OpenAPI generada por cada servicio y la del contrato.
- Eventos de `ImageViewer` que resulten necesarios para la edición de vértices.
