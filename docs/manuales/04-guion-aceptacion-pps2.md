# Guion de Aceptación Formal de la PPS 2 y Registro de Traspaso a PPS 1

**Proyecto:** Gestión, anotación e interoperabilidad de datasets de imágenes médicas (PPS 2)  
**Estudiante:** Nahuel  
**Cierre de Práctica:** Incremento I4 (PPS 2 §7 — Límite de práctica del backend)  
**Receptor de Traspaso (PPS 1):** Gino Paolo Tombesi (Visor WSI y Frontend)

---

## 1. Propósito y Criterios de Aceptación (PPS 2 §7)

Este documento certifica el cumplimiento de los criterios de salida y aceptación formal exigidos por el enunciado institucional de la **PPS 2 (§7)** y la línea base de arquitectura ([docs/arquitectura/06-organizacion-y-roadmap.md](file:///c:/Users/anvil/Desktop/PPS-WSI/docs/arquitectura/06-organizacion-y-roadmap.md)).

### Matriz de Criterios Institucionales

| # | Criterio de Aceptación | Evidencia Técnica en el Repositorio | Estado |
|---|---|---|---|
| **C1** | **Instalación y Despliegue Reproducible:** Levantar la totalidad del sistema desde un entorno limpio mediante Docker Compose sin pasos manuales ocultos. | `compose.yaml`, `.env.example`, `DatabaseInitializer` desatendido. Guía en [Manual de Despliegue](01-despliegue-y-operacion.md). | **Cumplido** |
| **C2** | **Registro de Imágenes Médicas:** Registrar imágenes de microscopía convencional (JPG/PNG) y formato piramidal Whole Slide Image (`.svs`). | Endpoint `POST /api/v1/datasets/{id}/images` con soporte de subida multipart directa y metadatos de resolución nativa. | **Cumplido** |
| **C3** | **Anotaciones Geométricas en Nivel 0:** Creación y persistencia de rectángulos y polígonos en coordenadas de nivel 0 independientes del factor de zoom. | `Pps.Domain.Annotations`, validadores de convexidad/límites y almacenamiento `jsonb` en PostgreSQL. | **Cumplido** |
| **C4** | **Autoría y Aislamiento Multi-Revisor:** Cada anotación conserva autor, fecha y versión; los revisores trabajan en conjuntos disjuntos y se protegen contra edición ajena (403 Forbidden). | `AccessGuardFilter`, validación de autoría en `AnnotationsController`, y separación de conjuntos por `userId`. | **Cumplido** |
| **C5** | **Ciclo de Vida y Concurrencia Optimista:** Modificación de vértices, reasignación de clases y borrado lógico con validación estricta de `If-Match` / `ETag` (HTTP 412/428). | `If-Match` obligatorio en `PUT /api/v1/annotations/{id}`, renovación de `ETag` y borrado lógico (`deleted_at`). | **Cumplido** |
| **C6** | **Importación de Datasets CRIC:** Ingesta de núcleos celulares del dataset CRIC con simulación previa (`dryRun: true`) y persistencia transaccional atómica. | `CricImporter`, `CricPointToBoxConverter`, endpoint `POST /api/v1/datasets/{id}/imports?format=cric`. Guía en [Manual CRIC](02-importacion-cric.md). | **Cumplido** |
| **C7** | **Exportación Interoperable:** Generación de formato interno documentado (`gia-annotations` v1.0) y formato estándar internacional COCO Object Detection. | `CocoExportDocument`, `CocoGeometryConverter`, endpoint `GET /api/v1/datasets/{id}/export`. Guía en [Manual Exportación](03-exportacion-formatos.md). | **Cumplido** |

---

## 2. Protocolo de Ejecución del Ensayo de Aceptación Integral

Para verificar de manera automatizada y de punta a punta la totalidad de los criterios C1 a C7 sobre los contenedores en caliente, ejecute el script de aceptación:

```powershell
python scripts/test_acceptance_i3.py
```

### Flujo secuencial ejecutado por el ensayo:
1. **Verificación de Salud de Servicios:** Sondeo de pasarela Nginx (`http://localhost:8080`), API ASP.NET Core (`http://localhost:8081/swagger`) y base de datos PostgreSQL 18.
2. **Autenticación e Ingreso:** Inicio de sesión con el administrador semilla (`admin@gia.local`), adquisición de cookie `gia_session` y creación de un segundo usuario (`revisor@gia.local`).
3. **Catálogo y Membresías:** Creación de un proyecto de prueba, alta de dataset, incorporación del revisor como miembro `annotator` y definición de clases de etiquetado.
4. **Subida y Registro:** Incorporación de imagen microscópica de prueba al dataset.
5. **Anotación Geométrica:** Inserción de un rectángulo y un polígono en coordenadas de nivel 0 con captura de `ETag`.
6. **Concurrencia Optimista (ETag / If-Match):**
   - Intento de mutación sin cabecera `If-Match` -> Rechazado con **HTTP 428 Precondition Required**.
   - Intento de mutación con versión obsoleta -> Rechazado con **HTTP 412 Precondition Failed**.
   - Mutación con versión vigente -> **HTTP 200 OK** con nuevo `ETag`.
7. **Aislamiento Multi-Revisor:** Intento de edición de la figura por parte de otro usuario -> Rechazado con **HTTP 403 Forbidden**.
8. **Borrado Lógico:** Eliminación de figura con **HTTP 204 No Content** y verificación de exclusión inmediata (**HTTP 404 Not Found** en consultas subsiguientes).
9. **Importación CRIC:**
   - Simulación con `dryRun: true` -> **HTTP 200 OK** sin escrituras en base de datos.
   - Ejecución con `dryRun: false` -> **HTTP 201 Created**, alta atómica de figuras con proveniencia.
10. **Exportación Dual:**
    - Descarga de formato interno documentado (`format=internal`).
    - Descarga y validación estructural de formato COCO (`format=coco`) con verificación de cajas `bbox` y segmentaciones poligonales.

---

## 3. Protocolo de Traspaso de Conocimiento hacia la PPS 1

Para garantizar la autonomía del desarrollo del frontend y visor (PPS 1) tras el congelamiento del backend de la PPS 2, se transfiere formalmente la siguiente arquitectura técnica:

### 3.1 Contrato Normativo OpenAPI 3.0
- **Ubicación:** [`contract/openapi/api.v1.yaml`](file:///c:/Users/anvil/Desktop/PPS-WSI/contract/openapi/api.v1.yaml)
- **Versión:** `0.2.0` (Candidata a 1.0.0 definitiva tras aprobación de supervisión).
- **Tipado estricto:** Los tipos TypeScript para el cliente web se regeneran mediante:
  ```bash
  cd web && npm run codegen
  ```

### 3.2 Matriz de Autorización y Manejo de Errores
- Toda petición protegida debe incluir la cookie de sesión HTTP `gia_session`.
- Las respuestas de error siguen estrictamente el estándar **RFC 9457 (Problem Details)**:
  - Formato JSON con campos `type`, `title`, `status`, `detail`, `instance` y extensiones específicas (ej. `invalidFields`, `currentVersion`).
- Los roles de proyecto escalonan privilegios:
  - `viewer`: Solo lectura de imágenes, clases y anotaciones.
  - `annotator`: Creación y edición de anotaciones propias; importación de datasets.
  - `admin`: Gestión de datasets, clases, miembros y subida de imágenes.

### 3.3 Editor de Anotaciones en Frontend (PPS 1)
- **Coordenadas:** El editor web debe transformar las coordenadas del canvas/OpenSeadragon al sistema de coordenadas de nivel 0 de la imagen antes de enviar el payload a `POST /api/v1/images/{id}/annotations`.
- **Concurrencia:** Al cargar una anotación para editarla en la UI, el cliente debe almacenar el `ETag` recibido y enviarlo obligatoriamente en la cabecera `If-Match` al guardar cambios (`PUT`).
- **Protección de Teselas:** El visor OpenSeadragon solicita teselas a `/tiles/{image_id}_files/{level}/{col}_{row}.jpeg`. La pasarela Nginx valida la autorización mediante un subrequest interno `auth_request` a `/api/v1/internal/tile-access/{image_id}`, asegurando que solo usuarios con membresía activa en el proyecto puedan visualizar las imágenes.

### 3.4 Guía Interactiva del Sistema (`/gia`)
- La guía interactiva viva desplegada en la ruta `/gia` de la SPA React documenta el catálogo interactivo de las 40 operaciones de la API, diagramas de secuencia Mermaid, estado de calidad y wireframes, sirviendo como manual de referencia integrado para el equipo.

---

## 4. Dictamen de Aceptación

Habiéndose verificado la totalidad de criterios de aceptación, con 292 pruebas automatizadas en verde y la ejecución satisfactoria del guion de punta a punta, el módulo de backend correspondiente a la **PPS 2 queda formalmente cerrado y congelado** para dar paso a la integración final de la PPS 1.
