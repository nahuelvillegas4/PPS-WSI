# Bitácora de Práctica Profesional Supervisada (PPS 2)
**Proyecto:** Gestión, anotación e interoperabilidad de datasets de imágenes médicas  
**Estudiante:** Nahuel  
**Carga horaria total requerida:** 200 horas (7 semanas de 6 horas por día, del 19/10/2026 al 03/12/2026) — *Confirmado según la línea base de arquitectura ([§2.2](arquitectura/01-introduccion-y-restricciones.md))*  
**Repositorio y entorno:** ASP.NET Core (C#), PostgreSQL 18, Docker & Docker Compose (`compose.yaml`). Versiones y decisiones en la [línea base de arquitectura](arquitectura/README.md); alineación del scaffolding completada según [ALINEACION_SCAFFOLDING_PPS2.md](ALINEACION_SCAFFOLDING_PPS2.md)  

---

## Estructura General del Plan de Trabajo

Plan alineado con los incrementos de la [arquitectura (§13)](arquitectura/06-organizacion-y-roadmap.md): el orden es fijo y las duraciones son indicativas. La semana 1 empieza el lunes 19/10/2026. Cada incremento termina con algo demostrable sobre el Compose integrado.

| Semana | Incremento | Eje principal (PPS 2) | Hito demostrable |
|---|---|---|---|
| **0** (Prep, 4 h) | — | Relevamiento, selección de stack, arquitectura y scaffolding Docker + .NET | Entorno inicial y Bitácora |
| **1** (19/10) | I0 · Base | Repositorio, CI y Compose con los cuatro servicios en versión «hola mundo»; contrato v0.1 acordado; scaffolding de la API alineado con la línea base | `docker compose up` desde cero en las dos máquinas; CI en verde |
| **2–3** (26/10 y 02/11) | I1 · Esqueleto de punta a punta | Ingreso por cookie, usuarios, proyectos, datasets y clases; registro de una PNG; rectángulo persistido en nivel 0; exportación del JSON interno | `smoke.sh` recorre el camino completo en la CI |
| **3–4** (02/11 y 09/11) | I2 · WSI, polígonos y conjuntos | Registro de WSI por el mismo camino; polígonos; clases por dataset; conjuntos por usuario (403 sobre anotaciones ajenas); contrato 1.0 | Anotación en WSI persistida en nivel 0; QS-1 a QS-4 y QS-8 medidos |
| **5–6** (16/11 y 23/11) | I3 · Edición, importación y exportación | Importación de CRIC con `dryRun` (CCEDD queda como extensión); exportación COCO (YOLO solo si sobra tiempo); ensayo de aceptación | Guion de aceptación de la PPS 2 de punta a punta en una instalación limpia |
| **7** (30/11) | I4 · Aceptación de la PPS 2 | Correcciones, manuales de API, importación y exportación; API congelada y documentada; traspaso de conocimiento | Aceptación de PPS 2 §7; cierre previsto el 03/12 |

Las geometrías se guardan como `jsonb` en nivel 0 y la sesión es por cookie ([ADR-04](adr/0004-sesion-y-proteccion-de-teselas.md), [ADR-07](adr/0007-modelo-de-datos-y-autoria.md)). El canvas de prueba sobre JPG/PNG lo cubre el `SimpleImageViewer` de la PPS 1 ([ADR-08](adr/0008-frontera-y-reparto-del-editor.md)).

<details>
<summary>Cronograma inicial del Día 0 (reemplazado por el plan de arriba; se conserva como registro)</summary>

## Estructura General del Plan de Trabajo (40 Días)

| Semana | Días | Eje Principal | Hito Demostrable de Entrega (Lunes) |
|---|---|---|---|
| **Semana 0 (Hoy)** | Prep (4h) | Relevamiento, selección de stack, arquitectura y scaffolding Docker + .NET | Entorno inicial y Bitácora |
| **Semana 1** | Días 1 al 5 | Contrato de integración, Arquitectura base, Autenticación, Proyectos y Datasets | **Hito 1 (Lunes 1):** API dockerizada con Swagger, Auth JWT y Gestión de Datasets/Clases |
| **Semana 2** | Días 6 al 10 | Modelo espacial de anotaciones (NetTopologySuite), CRUD de geometrías, Canvas de prueba JPG/PNG | **Hito 2 (Lunes 2):** Creación/edición de rectángulos y polígonos persistidos por usuario sobre imagen |
| **Semana 3** | Días 11 al 15 | Adaptador de coordenadas nivel 0 para WSI y aislamiento multi-revisor | CRUD completo de anotaciones con sistema de coordenadas normalizadas / nivel 0 |
| **Semana 4** | Días 16 al 20 | Módulo de importación de datasets (CRIC / CCEDD) | Importador CLI/API validado con subconjunto real |
| **Semana 5** | Días 21 al 25 | Módulo de exportación a JSON interno documentado y formato externo (COCO / YOLO) | Exportador verificado con pipeline de salida |
| **Semana 6** | Días 26 al 30 | Integración con PPS 1 (OpenSeadragon + visor WSI y capa de anotaciones) | Flujo integrado WSI + Anotaciones en navegador |
| **Semana 7** | Días 31 al 35 | Pruebas integrales, casos extremos, rendimiento de polígonos y validación de criterios | Suite de pruebas automatizadas y validación con datos reales |
| **Semana 8** | Días 36 al 40 | Empaquetado final Docker Compose, documentación técnica, manuales y entrega | Entrega final completa y defensa |

</details>

---

## Registro Diario de Actividades

### Día 0: Preparación y Planificación Inicial (Hoy)
- **Fecha:** 16/10/2026
- **Horas dedicadas:** 4 horas
- **Módulo:** Planificación, Arquitectura e Infraestructura
- **Actividades realizadas:**
  1. Análisis exhaustivo de los requerimientos de PPS 1 y PPS 2 y delimitación del alcance de Backend.
  2. Selección y justificación del stack tecnológico: ASP.NET Core 8 Web API, Entity Framework Core, PostgreSQL, NetTopologySuite y Docker Compose.
  3. Definición del cronograma de 40 días hábiles (200 horas) y los hitos demostrables para las presentaciones de los lunes.
  4. Diseño inicial del Contrato de Integración entre el visor WSI (PPS 1) y el backend de gestión (PPS 2).
  5. Scaffolding del proyecto .NET y configuración inicial de Dockerfile y `docker-compose.yml`.
- **Entregables:**
  - `BITACORA_PPS2.md` con planificación detallada.
  - Estructura base del repositorio con Docker Compose y API .NET.
- **Estado:** Completado.
- **Nota (17/10/2026):** el plan se alineó con la línea base de arquitectura acordada por los dos y se aplicó al código del scaffolding: carpeta renombrada a `api/`, `compose.yaml` en la raíz, cookie `gia_session` con Data Protection, eliminación de JWT y NetTopologySuite, y base PostgreSQL 18 estándar con `jsonb`.
- **Régimen acordado:** 7 semanas de 6 horas por día (cierre el 03/12/2026).

---

### Día 1: Scaffolding, Persistencia PostgreSQL 18, Migración a .NET 10 y Verificación Docker Compose
- **Fecha:** 19/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 10 horas)
- **Módulo:** Infraestructura, Persistencia, Observabilidad y Scaffolding Base
- **Actividades realizadas:**
  1. Alineación estructural del scaffolding: migración y renombre de carpeta `backend/` a `api/`, migración del stack completo a **.NET 10 LTS** (SDK 10.0.402, EF Core 10.0.13, Npgsql 10.0.3) y Dockerfile multi-stage con runtime ASP.NET Core 10 y `curl`.
  2. Implementación de entidades de dominio en `Pps.Domain` respetando la vertical modular: `User`, `Project`, `Dataset`, `LabelClass`, `MedicalImage`, `Annotation` (con polígonos GeoJSON en `jsonb` y control de concurrencia optimista `xmin`), `IAnnotationImporter` e `IExporter`.
  3. Configuración de persistencia en `AppDbContext` (PostgreSQL 18 estándar, sin extensiones PostGIS), mapeo snake_case, claves foráneas compuestas `(dataset_id, class_id)` y `(dataset_id, image_id)`, soft-delete global y migración inicial `InitialCreate`.
  4. Implementación del inicializador de base de datos (`DatabaseInitializer`) con aplicación automática de migraciones pendientes y seeding del usuario administrador inicial con PBKDF2 (`Microsoft.Extensions.Identity.Core`).
  5. Implementación de endpoints de operaciones y salud: `GET /health/live` (liveness 200) y `GET /health/ready` (readiness con ping a base de datos PostgreSQL, 200/503), alineados con OpenAPI y healthchecks de Docker Compose.
  6. Estandarización de errores bajo RFC 9457 Problem Details (`GiaExceptionHandler`, `urn:gia:problem:<slug>`) y trazabilidad de extremo a extremo mediante `TraceIdMiddleware` (`X-Request-ID` propagado como `traceId`).
  7. Implementación del endpoint interno de autorización de teselas `GET /internal/v1/tile-access` (ADR-06) con resolución de ruta `X-Original-URI`, validación de `storage_key` y cabecera de respuesta `X-Storage-Key`.
  8. Unificación y verificación en la raíz del repositorio con `compose.yaml` levantando los servicios `gia-db` (`postgres:18`) y `gia-api` (`pps-api:latest`), validando healthchecks, conectividad HTTP, Swagger y contratos de error.
- **Entregables / Commits:**
  - Archivos creados o modificados: `compose.yaml`, `.env.example`, `api/Dockerfile`, `Pps.Domain/*`, `Pps.Infrastructure/Persistence/*`, `Pps.Api/*`.
- **Dificultades y soluciones:**
  - La sincronización de concurrencia en PostgreSQL con EF Core 10 requirió mapear el token optimista directamente a la columna de sistema `xmin` mediante `IsRowVersion()`.
  - La instalación de .NET 10 en Windows requirió configurar la variable de entorno `DOTNET_ROOT` para las herramientas globales como `dotnet-ef`.
- **Estado:** Completado.

---

### Día 2: Autenticación, Sesión por Cookie, Gestión de Usuarios y Catálogo de Proyectos
- **Fecha:** 20/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 16 horas)
- **Módulo:** Autenticación y Usuarios (Épica E2), Catálogo (Épica E3)
- **Actividades realizadas:**
  1. Implementación de autenticación y sesión por cookie `gia_session` conforme a ADR-04: endpoints `POST /api/v1/auth/login`, `POST /api/v1/auth/logout` y `GET /api/v1/auth/me` con verificación de contraseñas mediante PBKDF2 (`IPasswordHasher<User>`).
  2. Implementación de protección contra ataques de fuerza bruta en memoria (`ILoginAttemptTracker` / `LoginAttemptTracker`) limitando intentos fallidos y respondiendo HTTP 429 (`urn:gia:problem:too-many-requests`).
  3. Implementación del módulo de gestión de usuarios exclusivos para administradores (`UsersController`): listado `GET /api/v1/users`, creación `POST /api/v1/users` (sin autorregistro, validación de regex `^[a-z0-9._-]{3,64}$`, control de duplicados HTTP 409 `duplicate-name`), consulta `GET /api/v1/users/{userId}` y actualización `PATCH /api/v1/users/{userId}` con validación `minProperties: 1`.
  4. Implementación del catálogo base de proyectos (`ProjectsController`): listado autenticado `GET /api/v1/projects`, creación por administrador `POST /api/v1/projects` con cabecera `Location` y control de duplicados (409), consulta `GET /api/v1/projects/{projectId}`, actualización `PATCH /api/v1/projects/{projectId}` y eliminación `DELETE /api/v1/projects/{projectId}` restringida si contiene datasets asociados (409 `not-empty`, ADR-07).
  5. Despliegue y verificación integral en caliente sobre el contenedor Docker Compose `gia-api` (.NET 10 LTS) y `gia-db` (PostgreSQL 18), validando con `curl` todos los flujos de autorización por rol, expiración de cookies y respuestas RFC 9457 Problem Details con `traceId`.
- **Entregables / Commits:**
  - Archivos creados o modificados:
    - `api/src/Pps.Api/Common/Security/ILoginAttemptTracker.cs`
    - `api/src/Pps.Api/Common/Security/LoginAttemptTracker.cs`
    - `api/src/Pps.Api/Common/Errors/GiaExceptions.cs`
    - `api/src/Pps.Api/Program.cs`
    - `api/src/Pps.Api/Controllers/Auth/AuthController.cs`
    - `api/src/Pps.Api/Controllers/Auth/Dtos/LoginRequest.cs`
    - `api/src/Pps.Api/Controllers/Auth/Dtos/CurrentUserResponse.cs`
    - `api/src/Pps.Api/Controllers/Users/UsersController.cs`
    - `api/src/Pps.Api/Controllers/Users/Dtos/UserResponse.cs`
    - `api/src/Pps.Api/Controllers/Users/Dtos/CreateUserRequest.cs`
    - `api/src/Pps.Api/Controllers/Users/Dtos/UpdateUserRequest.cs`
    - `api/src/Pps.Api/Controllers/Catalog/ProjectsController.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/ProjectResponse.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/ProjectInput.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/ProjectPatch.cs`
    - `docs/BITACORA_PPS2.md`
- **Dificultades y soluciones:**
  - El contrato requería que los cuerpos parciales en `PATCH` contuvieran al menos una propiedad (`minProperties: 1`). Se implementó `IValidatableObject` en los DTOs para integrarse nativamente con el factory de Problem Details RFC 9457 de ASP.NET Core.
- **Estado:** Completado.

---

### Día 3: Cierre de la Épica E3 — Catálogo de Datasets y Clases de Etiquetado
- **Fecha:** 21/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 22 horas)
- **Módulo:** Catálogo (Épica E3 — Datasets y Clases de Etiquetado)
- **Actividades realizadas:**
  1. Implementación del módulo de gestión de datasets (`DatasetsController`) alineado con OpenAPI (`api.v1.yaml`) y ADR-07: listado por proyecto `GET /api/v1/projects/{projectId}/datasets` (con validación de existencia de proyecto HTTP 404), creación por administrador `POST /api/v1/projects/{projectId}/datasets` (`201 Created` con cabecera `Location` y control de duplicados `409 duplicate-name` dentro del proyecto), consulta `GET /api/v1/datasets/{datasetId}`, actualización parcial `PATCH /api/v1/datasets/{datasetId}` (`minProperties: 1` mediante `IValidatableObject`) y eliminación `DELETE /api/v1/datasets/{datasetId}` restringida con `409 not-empty` si posee imágenes registradas.
  2. Implementación del módulo de gestión de clases de etiquetado (`ClassesController`): listado `GET /api/v1/datasets/{datasetId}/classes` ordenado estrictamente por `displayOrder` y luego por `id`, creación por administrador `POST /api/v1/datasets/{datasetId}/classes` con validación de color hexadecimal (`^#[0-9a-fA-F]{6}$`), cabecera `Location` y control de nombres duplicados en el dataset (`409 duplicate-name`), actualización parcial `PATCH /api/v1/classes/{classId}` y eliminación `DELETE /api/v1/classes/{classId}` restringida con `409 class-in-use` si existen anotaciones (activas o con borrado lógico) asociadas a la clase.
  3. Configuración de validación estricta de esquemas JSON (`JsonUnmappedMemberHandling.Disallow`) en `Program.cs` para cumplir con `additionalProperties: false` en todos los cuerpos de entrada (§8.5), rechazando propiedades no previstas con HTTP 400 (`urn:gia:problem:validation`), y ajuste de los tipos URN en `GiaProblemTypes` (`unsupported-media-type` para 415 e `internal` para 500).
  4. Reconstrucción de la imagen Docker `pps-api:latest` sobre `compose.yaml` y verificación de integración de punta a punta sobre los contenedores `gia-api` y `gia-db`.
- **Entregables / Commits:**
  - Archivos creados o modificados:
    - `api/src/Pps.Api/Controllers/Catalog/DatasetsController.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/DatasetResponse.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/DatasetInput.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/DatasetPatch.cs`
    - `api/src/Pps.Api/Controllers/Catalog/ClassesController.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/LabelClassResponse.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/LabelClassInput.cs`
    - `api/src/Pps.Api/Controllers/Catalog/Dtos/LabelClassPatch.cs`
    - `api/src/Pps.Api/Common/Errors/GiaProblemTypes.cs`
    - `api/src/Pps.Api/Program.cs`
    - `docs/BITACORA_PPS2.md`
- **Dificultades y soluciones:**
  - Se configuró `JsonUnmappedMemberHandling.Disallow` en `System.Text.Json` para garantizar que cualquier propiedad ajena al contrato OpenAPI dispare automáticamente el `InvalidModelStateResponseFactory` con formato RFC 9457 Problem Details.
  - En la eliminación de clases (`DELETE /api/v1/classes/{classId}`), se utilizó `IgnoreQueryFilters()` al verificar anotaciones asociadas para contemplar también las anotaciones con borrado lógico (`deleted_at != null`) que mantienen la restricción de integridad referencial en PostgreSQL.
- **Estado:** Completado (Incremento I0 y Épicas E2 y E3 100% cerradas del lado de PPS 2).

---

### Día 4: Épica E4 — Exploración de Almacenamiento, Inspección y Registro de Imágenes
- **Fecha:** 22/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 28 horas)
- **Módulo:** Almacenamiento y Registro de Imágenes (Épica E4, avance Incremento I1)
- **Actividades realizadas:**
  1. **Explorador de Almacenamiento del Servidor (`StorageController`):**
     - Implementación de `StorageKeyValidator` en el dominio para validación estricta contra ataques de Path Traversal (rechazo de `..`, rutas absolutas, barras invertidas `\` y caracteres de unidad) con mapeo a HTTP 422 (`urn:gia:problem:invalid-storage-key`).
     - Clasificación determinista de `kind`: `wsi` para `.svs`, `conventional` para `.png`/`.jpg`/`.jpeg`, y `other` para archivos no soportados.
     - Implementación de `IStorageService` y `PhysicalStorageService` para recorrer el volumen de imágenes `/data/images` de forma recursiva, omitiendo archivos ocultos y calculando `sizeBytes`.
     - Creación del endpoint `GET /api/v1/storage/files?prefix=` protegido para administradores (`[Authorize(Roles = "admin")]`) con cruce de datasets registrados (`registeredInDatasets`).
  2. **Modelado y Migración EF Core para Cumplimiento OpenAPI:**
     - Actualización de la entidad `MedicalImage` agregando las propiedades `Format` (`svs`, `png`, `jpeg`) y `LevelCount` exigidas por el esquema contractual `Image`.
     - Creación de la migración `20261021230741_AddImageFormatAndLevelCount` con índice único compuesto `(dataset_id, storage_key)` para garantizar atomicidad e integridad referencial contra duplicados.
  3. **Cliente de Inspección de Imágenes (`IImageInspector`):**
     - Implementación de `TilesImageInspector` como cliente HTTP hacia `GET /internal/v1/inspect?storageKey=` del servicio `tiles` (`http://tiles:8000`).
     - Propagación de trazabilidad distribuida mediante `TraceIdDelegatingHandler` inyectando la cabecera `X-Request-ID` en cada llamada interna.
     - Manejo exhaustivo de códigos de error según RFC 9457: mapeo de 404 (`urn:gia:problem:not-found`), 415/422 (`urn:gia:problem:unsupported-image-format`, `urn:gia:problem:invalid-storage-key`) y 503 (`urn:gia:problem:dependency-unavailable`), junto con fallback local determinista según §12.8 para desarrollo aislado.
  4. **Controlador y Registro Atómico de Imágenes (`ImagesController`):**
     - Endpoint `POST /api/v1/datasets/{datasetId}/images`: validación de prefijos, control de imágenes ya registradas en el dataset (`409 already-registered`), inspección técnica y persistencia atómica en una única transacción de base de datos (`201 Created`).
     - Endpoint `GET /api/v1/datasets/{datasetId}/images`: listado paginado (`page`, `pageSize`, `total`) retornando la URL de teselas DZI (`tileSourceUrl = /tiles/v1/images/{id}.dzi`).
     - Endpoint `GET /api/v1/images/{imageId}`: consulta individual de imagen y metadatos técnicos de nivel 0.
  5. **Verificación Integral en Docker Compose:**
     - Generación de imagen sintética de prueba D2 (`samples/prueba-1376x1020.png`, 1376 × 1020 px) con `scripts/make_sample_image.py`.
     - Despliegue conjunto y verificación con `curl` sobre `gia-api` (.NET 10 LTS), `gia-tiles` (FastAPI + OpenSlide) y `gia-db` (PostgreSQL 18).
     - Validación del ciclo completo: listado de archivos $\to$ registro en dataset $\to$ inspección por `tiles` $\to$ persistencia de dimensiones $\to$ re-consulta $\to$ autorización de teselas `GET /internal/v1/tile-access` respondiendo `204 No Content` con cabecera `X-Storage-Key`.
- **Entregables / Commits:**
  - Archivos creados o modificados:
    - `api/src/Pps.Domain/Images/IStorageService.cs`
    - `api/src/Pps.Domain/Images/IImageInspector.cs`
    - `api/src/Pps.Domain/Images/StorageKeyValidator.cs`
    - `api/src/Pps.Domain/Images/InvalidStorageKeyException.cs`
    - `api/src/Pps.Domain/Images/ImageInspectionExceptions.cs`
    - `api/src/Pps.Domain/Images/MedicalImage.cs`
    - `api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs`
    - `api/src/Pps.Infrastructure/Storage/TilesImageInspector.cs`
    - `api/src/Pps.Infrastructure/Persistence/AppDbContext.cs`
    - `api/src/Pps.Infrastructure/Persistence/Migrations/20261021230741_AddImageFormatAndLevelCount.cs`
    - `api/src/Pps.Infrastructure/Persistence/Migrations/20261021230741_AddImageFormatAndLevelCount.Designer.cs`
    - `api/src/Pps.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs`
    - `api/src/Pps.Api/Common/Middleware/TraceIdDelegatingHandler.cs`
    - `api/src/Pps.Api/Common/Errors/GiaExceptions.cs`
    - `api/src/Pps.Api/Common/Errors/GiaExceptionHandler.cs`
    - `api/src/Pps.Api/Controllers/Storage/StorageController.cs`
    - `api/src/Pps.Api/Controllers/Storage/Dtos/StorageFileResponse.cs`
    - `api/src/Pps.Api/Controllers/Images/ImagesController.cs`
    - `api/src/Pps.Api/Controllers/Images/Dtos/RegisterImagesRequest.cs`
    - `api/src/Pps.Api/Controllers/Images/Dtos/ImageResponse.cs`
    - `api/src/Pps.Api/Program.cs`
    - `docs/BITACORA_PPS2.md`
- **Dificultades y soluciones:**
  - En Docker, el volumen de imágenes se monta estrictamente en `/data/images`, mientras que en el host se encuentra en `./data/images`. Se implementó una resolución jerárquica en `Program.cs` que detecta `/data/images` en contenedores Linux y resuelve rutas relativas hacia arriba en desarrollo local sobre Windows.
  - El servicio de teselas (`tiles`) requiere propagación de `X-Request-ID` para correlación distribuida. Se implementó `TraceIdDelegatingHandler` conectado a `IHttpContextAccessor` que inyecta automáticamente el ID de rastreo a nivel de `HttpClient`.
- **Estado:** Completado (Épica E4 100% cerrada).

---

### Día 5 (Planificado para la próxima jornada): Épica E5 — Modelo Espacial y Persistencia de Anotaciones en Nivel 0
- **Fecha prevista:** 23/10/2026
- **Módulo:** Anotaciones (Épica E5, avance Incremento I1)
- **Tareas a realizar:**
  1. Implementar validador de geometrías GeoJSON según las reglas del Anexo A y el contrato (`geometry-validation.json`): verificación de límites de nivel 0 (`urn:gia:problem:geometry-out-of-bounds`), degeneración (`geometry-degenerate`), autointersecciones (`geometry-self-intersection`) y pertenencia de clase al dataset (`class-not-in-dataset`).
  2. Implementar `POST /api/v1/images/{imageId}/annotations` para creación de anotaciones (rectángulos y polígonos) persistidas en `jsonb` con autoría automática del usuario en sesión y cálculo de caja envolvente (`bbox`).
  3. Implementar `GET /api/v1/images/{imageId}/annotations` con filtrado por conjunto (`user` vs `all`) y soporte de concurrencia optimista (`ETag` / `If-Match` con columna `xmin`).
  4. Implementar actualización parcial `PATCH /api/v1/annotations/{annotationId}` y borrado lógico `DELETE /api/v1/annotations/{annotationId}` restringidos al autor o administrador.
  5. Verificación de casos numéricos contra los fixtures del contrato (`coordinates.json`, `geometry-validation.json`).
- **Estado:** Pendiente (Próxima jornada).

---

### Plantilla de Registro para los Siguientes Días (Semana 1 en adelante)

```markdown
### Día X: [Título breve de la jornada]
- **Fecha:** DD/MM/AAAA
- **Horas dedicadas:** 6 horas (Acumulado: Y horas)
- **Módulo:** [Arquitectura / Dominio / Base de Datos / Anotaciones / Importación / etc.]
- **Actividades realizadas:**
  1. ...
  2. ...
- **Entregables / Commits:**
  - Commit: `hash o mensaje`
  - Archivos creados o modificados: ...
- **Dificultades y soluciones:**
  - ...
- **Estado:** [En progreso / Completado]
```
