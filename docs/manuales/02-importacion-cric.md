# Manual Operativo: Importación de Datasets CRIC

**Proyecto:** Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 1 + PPS 2)  
**Módulo:** Adaptador de Importación e Interoperabilidad (Épica E8, ADR-0009 — Incremento I3)  
**Audiencia:** Administradores de datasets, patólogos e investigadores.

---

## 1. Contexto y Objetivos

El dataset **CRIC** (*Cervical Cell Image Classification*) contiene imágenes microscópicas convencionales de citología cervical con coordenadas puntuales de núcleos celulares clasificadas bajo el **Sistema Bethesda** para reporte citopatológico.

El módulo de importación de la API ([ADR-0009](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/adr/0009-importacion-por-adaptadores.md)) permite:
1. Ingerir anotaciones en formato CSV o JSON estructurado.
2. Convertir centros nucleares puntuales en **cajas delimitadoras (bounding boxes)** normalizadas a nivel 0.
3. Crear y asociar automáticamente las clases de etiquetado del Sistema Bethesda dentro del dataset de destino.
4. Ejecutar una **simulación previa (`dryRun: true`)** con reporte exhaustivo de inconsistencias antes de alterar la base de datos.
5. Garantizar la persistencia **atómica y transaccional (`dryRun: false`)** con trazabilidad completa y usuario de autoría de sistema (`import-cric`).

---

## 2. Formatos de Entrada Admitidos

El importador acepta archivos con formato **CSV** o **JSON**.

### 2.1 Formato CSV
Las columnas mínimas requeridas son:
- `image_filename` (o `filename`, `image`): Nombre del archivo de imagen (ej. `CRIC_001.png`).
- `cell_id`: Identificador entero o alfanumérico único de la célula en la imagen.
- `nucleus_x`: Coordenada X del centro del núcleo (en píxeles de nivel 0).
- `nucleus_y`: Coordenada Y del centro del núcleo (en píxeles de nivel 0).
- `bethesda_system` (o `class`, `label`): Categoría citológica Bethesda.

**Ejemplo de contenido CSV:**
```csv
image_filename,cell_id,nucleus_x,nucleus_y,bethesda_system
sample_cric.png,1,1024,850,NILM
sample_cric.png,2,1430,920,LSIL
sample_cric.png,3,560,1180,ASC-US
```

### 2.2 Formato JSON
```json
[
  {
    "image_filename": "sample_cric.png",
    "cell_id": 1,
    "nucleus_x": 1024,
    "nucleus_y": 850,
    "bethesda_system": "NILM"
  },
  {
    "image_filename": "sample_cric.png",
    "cell_id": 2,
    "nucleus_x": 1430,
    "nucleus_y": 920,
    "bethesda_system": "LSIL"
  }
]
```

---

## 3. Conversión Geométrica (Punto a Rectángulo)

Dado que las anotaciones CRIC originales son puntos centrales `(X, Y)` y el modelo de anotaciones del sistema requiere geometrías cerradas ([ADR-0006](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/adr/0006-geometrias-y-coordenadas.md), [ADR-0007](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/adr/0007-modelo-de-datos-y-autoria.md)):
- El conversor `CricPointToBoxConverter` genera una caja delimitadora de tamaño configurable (radio por defecto: 20 píxeles, lado de 40 px).
- Se calculan los vértices:
  $$\text{minX} = \max(0, X - \text{radio})$$
  $$\text{minY} = \max(0, Y - \text{radio})$$
  $$\text{maxX} = \min(\text{ancho}, X + \text{radio})$$
  $$\text{maxY} = \min(\text{alto}, Y + \text{radio})$$
- Si la caja excede los límites de la imagen de nivel 0, es recortada automáticamente para preservar la integridad espacial.
- El centro original `(nucleus_x, nucleus_y)` y el `cell_id` se conservan intactos en el metadato de trazabilidad `provenance` del registro de anotación.

---

## 4. Mapeo Automático de Clases Bethesda

Si el dataset de destino no cuenta con las clases definidas, el importador las cataloga automáticamente con códigos estandarizados y paleta de color distintiva:

| Categoría | Código | Descripción clínica | Color sugerido |
|---|---|---|---|
| **NILM** | `nilm` | Negativo para lesión intraepitelial o malignidad | `#2ECC71` (Verde) |
| **ASC-US** | `asc_us` | Células escamosas atípicas de significado indeterminado | `#F39C12` (Naranja) |
| **LSIL** | `lsil` | Lesión intraepitelial escamosa de bajo grado | `#E67E22` (Ámbar) |
| **ASC-H** | `asc_h` | Células escamosas atípicas, no se descarta HSIL | `#E74C3C` (Rojo claro) |
| **HSIL** | `hsil` | Lesión intraepitelial escamosa de alto grado | `#C0392B` (Rojo oscuro) |
| **SCC** | `scc` | Carcinoma de células escamosas | `#8E44AD` (Púrpura) |

---

## 5. Endpoints de la API y Flujo de Operación

### 5.1 Endpoint de Importación
`POST /api/v1/datasets/{datasetId}/imports`

Requiere rol `admin` o `annotator` en el proyecto del dataset.

**Parámetros de consulta (`Query String`):**
- `format`: Debe ser `cric` (obligatorio).
- `dryRun`: Booleano (`true` o `false`).

**Cuerpo de la petición (`multipart/form-data`):**
- `file`: Archivo CSV o JSON con las anotaciones.
- `sourceName`: Cadena identificatoria de la fuente (ej. `CRIC-Bethesda-Cohort-2026`).

---

### 5.2 Paso 1: Simulación Atómica (`dryRun: true`)

Antes de realizar cambios, ejecute una simulación para inspeccionar estadísticas, discrepancias o imágenes faltantes:

```bash
curl -X POST "http://localhost:8080/api/v1/datasets/1/imports?format=cric&dryRun=true" \
  -H "Cookie: gia_session=<TU_COOKIE>" \
  -F "file=@cric_annotations.csv" \
  -F "sourceName=CRIC-Cohort-A"
```

**Respuesta esperada (HTTP 200 OK):**
```json
{
  "importId": null,
  "dryRun": true,
  "sourceName": "CRIC-Cohort-A",
  "totalRecords": 150,
  "importedCount": 150,
  "skippedCount": 0,
  "classesCreated": ["NILM", "LSIL", "ASC-US"],
  "classesReused": [],
  "warnings": [],
  "matchedImages": 3,
  "unmatchedImageFiles": []
}
```

---

### 5.3 Paso 2: Ejecución Real (`dryRun: false`)

Una vez validada la simulación, confirme la importación definitiva:

```bash
curl -X POST "http://localhost:8080/api/v1/datasets/1/imports?format=cric&dryRun=false" \
  -H "Cookie: gia_session=<TU_COOKIE>" \
  -F "file=@cric_annotations.csv" \
  -F "sourceName=CRIC-Cohort-A"
```

**Respuesta esperada (HTTP 201 Created):**
```json
{
  "importId": 4,
  "dryRun": false,
  "sourceName": "CRIC-Cohort-A",
  "totalRecords": 150,
  "importedCount": 150,
  "skippedCount": 0,
  "classesCreated": ["NILM", "LSIL", "ASC-US"],
  "classesReused": [],
  "warnings": [],
  "matchedImages": 3,
  "unmatchedImageFiles": []
}
```

---

## 6. Tratamiento de Errores y Validaciones (RFC 9457)

| Código HTTP | Tipo de Problema (`type`) | Causa y Solución |
|---|---|---|
| **409 Conflict** | `urn:gia:problem:already-imported` | La fuente (`sourceName`) ya fue importada previamente en este dataset. Para re-importar, utilice un nombre de fuente diferente o elimine las anotaciones previas. |
| **422 Unprocessable** | `urn:gia:problem:import-too-large` | El archivo supera el límite de seguridad de escala (2.000 imágenes o 50.000 figuras por lote según ADR-09). Divida el dataset en lotes menores. |
| **422 Unprocessable** | `urn:gia:problem:import-parse-error` | El CSV o JSON no contiene las columnas requeridas o presenta sintaxis inválida. |
| **404 Not Found** | `urn:gia:problem:dataset-not-found` | El dataset indicado no existe o fue eliminado lógicamente. |
| **403 Forbidden** | `urn:gia:problem:forbidden` | El usuario carece de membresía activa en el proyecto o posee únicamente rol de visualizador (`viewer`). |

---

## 7. Verificación Automatizada

El script de prueba integral verifica todo el ciclo de importación CRIC contra los contenedores en ejecución:

```bash
python scripts/test_cric_import.py
```
Valida:
1. Simulación exitosa con cálculo de advertencias.
2. Inserción atómica y persistencia en base de datos.
3. Rechazo ante intento de duplicación de importación (409 Conflict).
4. Verificación de coordenadas y proveniencia en las figuras creadas.
