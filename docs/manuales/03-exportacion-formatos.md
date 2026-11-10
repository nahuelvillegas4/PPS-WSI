# Manual Operativo: Exportación de Anotaciones e Interoperabilidad

**Proyecto:** Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 1 + PPS 2)  
**Módulo:** Exportación e Interoperabilidad de Datasets (Épica E9, ADR-0010 — Incremento I3)  
**Audiencia:** Investigadores de aprendizaje automático, bioingenieros y desarrolladores.

---

## 1. Introducción y Formatos Soportados

El módulo de exportación ([ADR-0010](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/adr/0010-exportacion.md)) permite descargar las anotaciones geométricas almacenadas en la base de datos para su explotación directa en pipelines de entrenamiento de visión por computadora.

El sistema proporciona dos formatos de salida normalizados en coordenadas de **nivel 0 (resolución nativa de la imagen)**:

1. **Formato Interno Documentado (`format=internal`):**
   - Esquema propio `gia-annotations` versión `1.0`.
   - Preserva la totalidad de metadatos clínicos, autoría, conjuntos por revisor, histórico de versiones (ETag) y proveniencia de importación (`provenance`).
2. **Formato Estándar COCO (`format=coco`):**
   - Compatible con la especificación internacional **COCO Object Detection** (*Common Objects in Context*).
   - Estructurado en convención `snake_case` con secciones estándar: `info`, `licenses`, `images`, `annotations` y `categories`.
   - Compatible de forma nativa con frameworks de Deep Learning como PyTorch (*torchvision*), Detectron2, MMDetection y YOLO.

---

## 2. Especificación de Formatos

### 2.1 Formato Interno (`gia-annotations` v1.0)

Estructura de salida JSON:
```json
{
  "schemaVersion": "1.0",
  "dataset": {
    "id": 1,
    "name": "Biopsias Cervicales 2026",
    "description": "Dataset de prueba para detección celular",
    "projectId": 1
  },
  "exportedAt": "2026-11-10T15:30:00Z",
  "exportedBy": "admin@gia.local",
  "classes": [
    { "id": 1, "code": "nilm", "name": "NILM", "color": "#2ECC71" }
  ],
  "images": [
    {
      "id": 1,
      "filename": "wsi_sample_01.svs",
      "width": 45000,
      "height": 32000,
      "annotations": [
        {
          "id": 101,
          "classId": 1,
          "className": "NILM",
          "userId": 2,
          "userEmail": "patologo1@hospital.local",
          "geometry": {
            "type": "rectangle",
            "x": 12450.0,
            "y": 8320.0,
            "width": 400.0,
            "height": 250.0
          },
          "version": 1,
          "createdAt": "2026-10-28T14:15:00Z"
        }
      ]
    }
  ]
}
```

---

### 2.2 Formato Externo COCO Object Detection

Estructura conforme al estándar COCO:
```json
{
  "info": {
    "year": 2026,
    "version": "1.0",
    "description": "Exportación COCO - Dataset Biopsias Cervicales 2026",
    "contributor": "GIA - Plataforma de Anotacion de Imagenes Medicas",
    "date_created": "2026-11-10T15:30:00Z"
  },
  "licenses": [
    {
      "id": 1,
      "name": "Restricted Research License",
      "url": "http://localhost:8080/licenses"
    }
  ],
  "images": [
    {
      "id": 1,
      "file_name": "wsi_sample_01.svs",
      "width": 45000,
      "height": 32000,
      "date_captured": "2026-10-25T10:00:00Z",
      "license": 1
    }
  ],
  "annotations": [
    {
      "id": 101,
      "image_id": 1,
      "category_id": 1,
      "segmentation": [
        [12450.0, 8320.0, 12850.0, 8320.0, 12850.0, 8570.0, 12450.0, 8570.0]
      ],
      "area": 100000.0,
      "bbox": [12450.0, 8320.0, 400.0, 250.0],
      "iscrowd": 0
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "NILM",
      "supercategory": "cell"
    }
  ]
}
```

---

## 3. Algoritmos de Conversión Geométrica

El conversor `CocoGeometryConverter` traduce las geometrías de nivel 0 a los primitivos numéricos exigidos por COCO:

1. **Rectángulos (`RectangleGeometry`):**
   - **`bbox`:** Vector `[x, y, width, height]`.
   - **`segmentation`:** Polígono cerrado de 4 vértices continuos `[[x, y, x+w, y, x+w, y+h, x, y+h]]`.
   - **`area`:** Cálculo directo $\text{width} \times \text{height}$.
2. **Polígonos (`PolygonGeometry`):**
   - **`segmentation`:** Aplanamiento secuencial de pares de coordenadas `[[x1, y1, x2, y2, ..., xn, yn]]`.
   - **`bbox`:** Caja envolvente mínima calculada:
     $$\text{minX} = \min(x_i), \quad \text{minY} = \min(y_i)$$
     $$\text{width} = \max(x_i) - \text{minX}, \quad \text{height} = \max(y_i) - \text{minY}$$
   - **`area`:** Cálculo del área del polígono simple mediante la **fórmula del área de Gauss (Shoelace formula)**:
     $$A = \frac{1}{2} \left| \sum_{i=1}^{n} (x_i y_{i+1} - x_{i+1} y_i) \right|$$

---

## 4. Endpoints de la API y Ejemplos de Uso

### 4.1 Endpoint de Exportación
`GET /api/v1/datasets/{datasetId}/export`

Requiere rol `admin`, `annotator` o `viewer` en el proyecto del dataset.

**Parámetros de consulta (`Query String`):**
- `format`: Formato de salida deseado (`internal` o `coco`). Por defecto: `internal`.
- `userId` *(opcional)*: Identificador del usuario anotador. Si se especifica, filtra las anotaciones exportando únicamente el conjunto confeccionado por dicho revisor (aislamiento multi-revisor, [ADR-0007](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/adr/0007-modelo-de-datos-y-autoria.md)). Si se omite, exporta todas las anotaciones activas del dataset.

**Cabecera de respuesta generada:**
```http
Content-Type: application/json
Content-Disposition: attachment; filename="dataset_1_coco_20261110_153000.json"
```

---

### 4.2 Ejemplos con cURL

- **Descargar formato interno documentado:**
  ```bash
  curl -s -X GET "http://localhost:8080/api/v1/datasets/1/export?format=internal" \
    -H "Cookie: gia_session=<TU_COOKIE>" \
    -o dataset_1_internal.json
  ```

- **Descargar formato estándar COCO:**
  ```bash
  curl -s -X GET "http://localhost:8080/api/v1/datasets/1/export?format=coco" \
    -H "Cookie: gia_session=<TU_COOKIE>" \
    -o dataset_1_coco.json
  ```

- **Descargar conjunto exclusivo de un revisor:**
  ```bash
  curl -s -X GET "http://localhost:8080/api/v1/datasets/1/export?format=coco&userId=2" \
    -H "Cookie: gia_session=<TU_COOKIE>" \
    -o dataset_1_coco_revisor2.json
  ```

---

## 5. Reglas de Negocio y Garantías de Integridad

1. **Exclusión de Borrados Lógicos:** Las figuras eliminadas (`deleted_at IS NOT NULL`) son excluidas automáticamente del archivo de exportación mediante el filtro global de EF Core.
2. **Validación de Categorías:** Cada figura exportada contiene obligatoriamente su categoría asociada existente en el catálogo del dataset.
3. **Imágenes sin Anotaciones:** Se incluyen en la lista `images` del documento COCO respetando su ancho y alto originales, permitiendo a los pipelines de ML computar imágenes negativas (sin instancias de patología).

---

## 6. Verificación Automatizada

Para verificar la integridad del exportador COCO y su conformidad contractual sobre la instalación en caliente:

```bash
python scripts/test_coco_export.py
```
El script verifica la presencia de los atributos requeridos (`images`, `annotations`, `categories`), la exactitud del cálculo de `bbox` y `area`, y el respeto a la convención snake_case.
