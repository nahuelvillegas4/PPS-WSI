# Propuesta de Contrato de Integración: PPS 1 (Visor WSI) y PPS 2 (Backend Anotaciones)

> **Estado: propuesta inicial, superada por [`contract/`](../contract/README.md) (v0.1.0).** El principio rector se mantiene (coordenadas de nivel 0). Rutas, identificadores y formato de geometría cambiaron. Si este texto y `contract/` difieren, manda `contract/`. Lo que sigue a la tabla es el texto original, sin modificar.

## Equivalencias con el contrato vigente

| Tema | Esta propuesta | Contrato vigente (`contract/`) |
|---|---|---|
| Coordenadas | Nivel 0, píxeles reales de máxima resolución | Igual: nivel 0 con decimales, origen arriba a la izquierda ([ADR-06](adr/0006-geometrias-y-coordenadas.md)). El servidor valida y rechaza, nunca transforma |
| Prefijo de rutas | `/api/...` | `/api/v1/...`, con `/tiles/v1/...` para el servicio de teselas |
| Identificadores | Cadenas (`wsi-uuid-1234`, `anno-uuid-5678`) | Enteros |
| Metadatos de imagen | PPS 1 informa `imageId`, `filename`, `level0Width`, `level0Height`, `dziUrl`, `mppX`, `mppY` | La API consulta al servicio de teselas (`GET /internal/v1/inspect`) y expone `GET /api/v1/images/{imageId}` con `name`, `width`, `height` (nivel 0), `mppX`, `mppY` y `tileSourceUrl` (`/tiles/v1/images/{id}.dzi`) |
| Clases | `colorHex` | `color` (`#RRGGBB`) y `displayOrder` |
| Filtro por revisor | `?userId={id}` | `?author=me` (por defecto), `all` o el id de un usuario |
| Geometría | `geometryType: "Polygon"` con `coordinates` y anillo cerrado; el rectángulo como polígono de 4 vértices o `BoundingBox` | `geometry` con `{"type":"rectangle","x","y","width","height"}` o `{"type":"polygon","points":[[x,y],…]}`. **No se repite el primer vértice**: el cierre explícito se rechaza con 422 |
| Modificar | `PUT /api/annotations/{id}` | `PATCH /api/v1/annotations/{annotationId}` con `If-Match` (428 si falta, 412 si no coincide) |
| Borrar | «soft delete o hard delete» | Borrado lógico, respuesta 204 |
| Autor y fechas | Vienen en el cuerpo de la anotación | Los pone el servidor; enviarlos en el cuerpo es un 400 |
| Campos extra | `className`, `properties` (`confidence`, `comments`) | Fuera de v0.1: la anotación lleva `classId`, `source`, `version` y `authorUsername`; el nombre de la clase se resuelve con `GET /api/v1/datasets/{datasetId}/classes` |

---

## Texto original de la propuesta

Este documento establece el contrato técnico y de interfaces entre el módulo de visualización WSI (PPS 1) y el módulo de gestión, persistencia e interoperabilidad de datasets y anotaciones (PPS 2).

---

## 1. Principio Rector: Sistema de Coordenadas de Nivel 0

- **Invarianza de escala:** Todas las anotaciones (rectángulos, polígonos) se persisten y se transmiten al backend en **coordenadas de píxel reales de máxima resolución (Nivel 0)** de la imagen.
- **Responsabilidad de PPS 1 (Visor):** Convertir las coordenadas de pantalla/viewport (zoom y pan en OpenSeadragon) a coordenadas absolutas de nivel 0 al dibujar, y viceversa al renderizar geometrías recibidas de PPS 2.
- **Responsabilidad de PPS 2 (Backend):** Almacenar las geometrías en coordenadas absolutas de nivel 0, asociadas al ID de la imagen, clase, autor y fecha.

---

## 2. Metadatos de la Imagen expuestos por PPS 1 hacia PPS 2

Al registrar una imagen WSI (ej. `.svs`), PPS 1 (o el servicio de OpenSlide) proporciona a PPS 2:

```json
{
  "imageId": "wsi-uuid-1234",
  "filename": "sample_tissue.svs",
  "format": "SVS",
  "level0Width": 105420,
  "level0Height": 84200,
  "dziUrl": "/api/tiles/wsi-uuid-1234.dzi",
  "mppX": 0.25,
  "mppY": 0.25
}
```

---

## 3. Endpoints expuestos por PPS 2 (API REST)

### 3.1. Proyectos, Datasets y Clases
- `GET /api/projects`: Lista de proyectos.
- `GET /api/projects/{id}/datasets`: Datasets dentro de un proyecto.
- `GET /api/datasets/{id}/classes`: Clases/etiquetas habilitadas para ese dataset (ej: `{"id": 1, "name": "Célula Neoplásica", "colorHex": "#FF0000"}`).

### 3.2. Gestión de Imágenes
- `GET /api/datasets/{id}/images`: Lista de imágenes registradas en el dataset.
- `GET /api/images/{id}`: Detalle de la imagen y dimensiones de nivel 0.

### 3.3. Anotaciones por Imagen
- `GET /api/images/{id}/annotations`: Obtiene las anotaciones de una imagen.
  - Query params opcionales: `?userId={id}` para filtrar por revisor, o traer las del usuario autenticado.
- `POST /api/images/{id}/annotations`: Crea una nueva anotación.
- `PUT /api/annotations/{id}`: Modifica la geometría o metadatos de una anotación existente.
- `DELETE /api/annotations/{id}`: Elimina una anotación (soft delete o hard delete).

---

## 4. Formato Interno JSON de Anotaciones (Geometría GeoJSON/Cartesiana)

```json
{
  "id": "anno-uuid-5678",
  "imageId": "wsi-uuid-1234",
  "classId": 1,
  "className": "Célula Neoplásica",
  "authorId": "user-uuid-99",
  "authorUsername": "medico_revisor1",
  "createdAt": "2026-10-19T10:30:00Z",
  "updatedAt": "2026-10-19T10:30:00Z",
  "geometryType": "Polygon",
  "coordinates": [
    [
      [12500, 34200],
      [12650, 34200],
      [12650, 34350],
      [12500, 34350],
      [12500, 34200]
    ]
  ],
  "properties": {
    "confidence": 1.0,
    "comments": "Observada atipia nuclear"
  }
}
```
*Para rectángulos:* puede expresarse como Polygon de 4 vértices cerrados o como BoundingBox `[minX, minY, width, height]`.
