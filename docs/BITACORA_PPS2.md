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
| **3–4** (02/11 y 09/11) | I2 · WSI, polígonos y conjuntos | Subida y registro de WSI (`.svs`) e imágenes múltiples por dataset (`admin` y `annotator`); polígonos; clases por dataset; conjuntos por usuario (403 sobre anotaciones ajenas); contrato 1.0 | Anotación en WSI persistida en nivel 0; subida de imágenes por dataset; QS-1 a QS-4 y QS-8 medidos |
| **5–6** (16/11 y 23/11) | I3 · Edición, importación y exportación | Importación de CRIC con `dryRun` (CCEDD queda como extensión); exportación COCO (YOLO solo si sobra tiempo); ensayo de aceptación y comprobación de despliegue en servidor Linux | Guion de aceptación de la PPS 2 de punta a punta en una instalación limpia en servidor Linux |
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

### Día 5: Épica E5 — Modelo Espacial, Validación Geométrica y Persistencia de Anotaciones en Nivel 0
- **Fecha:** 23/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 34 horas)
- **Módulo:** Anotaciones y Modelo Espacial (Épica E5, avance Incremento I1)
- **Actividades realizadas:**
  1. **Motor de Dominio y Modelado Polimórfico de Geometrías (`Pps.Domain.Annotations`):**
     - Modelado polimórfico de geometrías nivel 0 (`Geometry`, `RectangleGeometry`, `PolygonGeometry`) con soporte de discriminador `type` y deserialización fuera de orden (`AllowOutOfOrderMetadataProperties = true`) requerida para la persistencia no ordenada de PostgreSQL `jsonb`.
     - Implementación de validación estricta de esquemas (HTTP 400 `urn:gia:problem:validation`) validando rangos, dimensiones estrictamente positivas y cantidad y componentes de vértices mediante `IValidatableObject`.
  2. **Validador de Geometrías de Dominio (`GeometryValidator`):**
     - Implementación algorítmica de reglas del Anexo A y contrato v0.1 en orden determinista: límites de nivel 0 (`urn:gia:problem:geometry-out-of-bounds`), degeneración por cierre explícito o vértices repetidos (`urn:gia:problem:geometry-degenerate`), autointersecciones complejas tipo moño mediante intersección de segmentos 2D (`urn:gia:problem:geometry-self-intersection`) y degeneración por área nula/colinealidad (fórmula del cordón de zapato / Gauss).
     - Cálculo determinista de caja envolvente (`BboxMinX`, `BboxMinY`, `BboxMaxX`, `BboxMaxY`) y área en nivel 0.
  3. **Controlador y Endpoints de Anotaciones (`AnnotationsController`):**
     - `POST /api/v1/images/{imageId}/annotations`: creación y persistencia atómica en `jsonb`, autoría asignada automáticamente al usuario en sesión (`gia_session`), validación de pertenencia de clase al dataset de la imagen (HTTP 422 `urn:gia:problem:class-not-in-dataset`), retorno de `201 Created` con cabeceras `Location` y `ETag` (concurrencia optimista `xmin`).
     - `GET /api/v1/images/{imageId}/annotations`: listado con filtrado por conjunto (`author=me`, `author=all` o `{userId}`), excluyendo registros con borrado lógico (`deleted_at == null`).
     - `GET /api/v1/annotations/{annotationId}`: consulta individual retornando la versión en la cabecera `ETag`.
     - `PATCH /api/v1/annotations/{annotationId}`: actualización parcial (`classId` y/o `geometry`), cabecera `If-Match` obligatoria (HTTP 428 si falta, HTTP 412 `urn:gia:problem:version-mismatch` si no coincide), y aislamiento estricto de autores (HTTP 403 `urn:gia:problem:forbidden` incluso para administradores, según ADR-07).
     - `DELETE /api/v1/annotations/{annotationId}`: borrado lógico (`deleted_at = DateTime.UtcNow`), `If-Match` opcional, restringido estrictamente al autor (403), respondiendo `204 No Content`.
  4. **Suite de Pruebas Automatizadas y Verificación contra Fixtures del Contrato:**
     - Creación del proyecto de pruebas xUnit `Pps.Domain.Tests` en .NET 10 LTS.
     - Cobertura completa contra los casos de `contract/fixtures/geometry-validation.json`: verificación de casos válidos, rechazo de casos 400 y mapeo exacto de los casos 422 al URN correspondiente.
     - Despliegue y verificación en vivo sobre Docker Compose (`gia-api`, `gia-db` y `gia-tiles`), validando concurrencia optimista, protección contra modificaciones ajenas y restricción de integridad referencial al intentar eliminar clases en uso (`409 class-in-use`).
- **Entregables / Commits:**
  - Archivos creados o modificados:
    - `api/src/Pps.Domain/Annotations/Geometry.cs`
    - `api/src/Pps.Domain/Annotations/RectangleGeometry.cs`
    - `api/src/Pps.Domain/Annotations/PolygonGeometry.cs`
    - `api/src/Pps.Domain/Annotations/GeometryValidator.cs`
    - `api/src/Pps.Domain/Annotations/GeometryExceptions.cs`
    - `api/src/Pps.Api/Controllers/Annotations/AnnotationsController.cs`
    - `api/src/Pps.Api/Controllers/Annotations/Dtos/CreateAnnotationRequest.cs`
    - `api/src/Pps.Api/Controllers/Annotations/Dtos/UpdateAnnotationRequest.cs`
    - `api/src/Pps.Api/Controllers/Annotations/Dtos/AnnotationResponse.cs`
    - `api/src/Pps.Api/Controllers/Annotations/Dtos/AnnotationListResponse.cs`
    - `api/src/Pps.Api/Common/Errors/GiaExceptionHandler.cs`
    - `api/src/Pps.Api/Program.cs`
    - `api/Dockerfile`
    - `api/tests/Pps.Domain.Tests/*`
    - `docs/BITACORA_PPS2.md`
- **Dificultades y soluciones:**
  - PostgreSQL almacena las columnas `jsonb` ordenando internamente las claves por longitud y hash, lo que provocaba que `"x"` y `"y"` precedieran a `"type"`. En .NET 10 se habilitó `AllowOutOfOrderMetadataProperties = true` en las opciones de serialización polimórfica para tolerar atributos fuera de orden sin requerir almacenamiento en texto plano.
  - La validación de modelos polimórficos de ASP.NET Core no evaluaba automáticamente `IValidatableObject` sobre propiedades declaradas con el tipo base abstracto `Geometry`. Se implementó la invocación recursiva explícita de `Validator.TryValidateObject` en los DTOs de entrada.
- **Estado:** Completado (Épica E5 100% cerrada).

---

### Día 6: Épica E9 — Módulo de Exportación a JSON Interno Documentado (ADR-10) y Cierre de I1 (Backend)
- **Fecha:** 26/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 40 horas)
- **Módulo:** Exportación (Épica E9, Cierre del Incremento I1 del lado de PPS 2)
- **Actividades realizadas:**
  1. **Modelado Contractual de Exportación Interna (`Pps.Domain.Export`):**
     - Definición de records y DTOs para la serialización exacta de `internal-export.schema.json` (formato `gia-annotations` v1.0): metadatos del dataset, proyecto asociado, clases activas ordenadas por `displayOrder` e `id`, sistema de coordenadas en nivel 0 (`top-left-corner`, `down`, `px`), lista consolidada de autores con discriminación de origen (`human` vs. `import`), e imágenes con sus geometrías nivel 0 y procedencia (`provenance`).
     - Creación de `ExportSlugifier` para generación limpia y normalizada de slugs de descarga (`{slug}-export.json`).
     - Creación de `AuthorsFilterParser` para resolución determinista de filtros de autoría (`me` resolviendo al ID del usuario en sesión, `all` para el conjunto global, o lista de IDs enteros separados por comas).
  2. **Servicio de Exportación (`InternalJsonExporter` implementando `IExporter`):**
     - Implementación de `InternalJsonExporter` en `Pps.Infrastructure.Export` con consultas optimizadas de solo lectura (`AsNoTracking`) sobre PostgreSQL 18.
     - Agrupación eficiente de anotaciones por imagen, exclusión automática de registros con borrado lógico (`deleted_at != null`) y mapeo polimórfico de geometrías nivel 0.
     - Serialización UTF-8 con `JsonSerializerOptions` garantizando salida de propiedades nulas obligatorias (`mppX: null`, `provenance: null`) y codificación de caracteres acentuados sin secuencias de escape innecesarias (`UnsafeRelaxedJsonEscaping`).
  3. **Controlador HTTP y Endpoints Contractuales (`ExportController`):**
     - Implementación del endpoint `GET /api/v1/datasets/{datasetId}/export` bajo el tag `io` alineado con OpenAPI (`api.v1.yaml`).
     - Validación exhaustiva de parámetros: obligatoriedad de `format` (HTTP 400), rechazo con HTTP 422 de formatos aplazados a I3 (`coco`, `yolo`) citando ADR-10, validación de IDs en `authors` (HTTP 400) y manejo de dataset inexistente (HTTP 404).
     - Descarga de archivo mediante `Content-Disposition: attachment; filename="{slug}-export.json"`.
  4. **Suite de Pruebas Automatizadas y Validación contra Esquema Contractual:**
     - Integración de `JsonSchema.Net` en `Pps.Domain.Tests`.
     - Verificación automatizada de validez de esquema contra `contract/schemas/internal-export.schema.json` y el fixture oficial `contract/fixtures/export.json`.
     - Cobertura de pruebas unitarias sobre serialización de modelos, parsing de filtros de autor y generación de slugs (24/24 tests en verde).
  5. **Verificación Integral en Vivo sobre Docker Compose:**
     - Despliegue y validación en caliente sobre `gia-api` (.NET 10 LTS), `gia-db` (PostgreSQL 18) y `gia-tiles`.
     - Prueba de punta a punta: inicio de sesión $\to$ listado de proyectos/datasets/imágenes $\to$ creación de anotaciones tipo rectángulo y polígono $\to$ exportación del JSON interno con descarga `Content-Disposition` y validación de cabeceras HTTP.
- **Entregables / Commits:**
  - Archivos creados o modificados:
    - `api/src/Pps.Domain/Export/IExporter.cs`
    - `api/src/Pps.Domain/Export/ExportSlugifier.cs`
    - `api/src/Pps.Domain/Export/AuthorsFilterParser.cs`
    - `api/src/Pps.Domain/Export/Internal/InternalExportModels.cs`
    - `api/src/Pps.Infrastructure/Export/InternalJsonExporter.cs`
    - `api/src/Pps.Api/Controllers/IO/ExportController.cs`
    - `api/src/Pps.Api/Common/Errors/GiaExceptions.cs`
    - `api/src/Pps.Api/Common/Errors/GiaExceptionHandler.cs`
    - `api/src/Pps.Api/Program.cs`
    - `api/tests/Pps.Domain.Tests/ExportTests.cs`
    - `docs/BITACORA_PPS2.md`
- **Dificultades y soluciones:**
  - `JsonSchema.Net` restringe la re-registración estática de esquemas con el mismo URI; se utilizó una inicialización `Lazy<JsonSchema>` para compartir de manera segura el esquema registrado entre pruebas unitarias concurrentes.
  - El esquema contractual exige que propiedades como `mppX`, `mppY` y `provenance` estén explícitamente presentes incluso cuando su valor es nulo; se configuró `JsonIgnoreCondition.Never` en el serializador de exportación para cumplir estrictamente con `required` y `additionalProperties: false`.
- **Estado:** Completado (Incremento I1 100% cerrado del lado de Backend / PPS 2).

---

### Día 7: Inicio del Incremento I2 — Subida de Imágenes Simples/Múltiples a Datasets, Soporte WSI (`.svs`) y Aislamiento Multi-Revisor
- **Fecha:** 27/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 46 horas)
- **Módulo:** Almacenamiento y Subida de Imágenes (Épica E4), WSI Nivel 0 y Conjuntos por Usuario (Épicas E5/E7 — Incremento I2)
- **Actividades realizadas:**
  1. **Ajuste de Planificación tras Muestra con la Supervisión:**
     - Incorporación del requerimiento de subida directa de una o múltiples imágenes (`.svs`, `.png`, `.jpg`, `.jpeg`) a un dataset por cualquier usuario autenticado (`admin` o `annotator`), quedando registradas como pertenecientes a dicho dataset al consultarlas (`GET /api/v1/datasets/{datasetId}/images`).
     - Confirmación de que el alta de usuarios por administrador ya se encuentra resuelta en la API desde el Día 2 (`POST /api/v1/users`) y programación de la comprobación de despliegue en servidor Linux para el Incremento I3.
  2. **Almacenamiento Físico en Streaming y Validación de Claves por Dataset (`Pps.Domain.Images` y `Pps.Infrastructure.Storage`):**
     - Extensión de `StorageKeyValidator` con `SanitizeFileName` y `BuildDatasetStorageKey(datasetId, rawFileName)` para construir claves deterministas `datasets/{datasetId}/{filename}`, limpiando rutas del cliente, rechazando archivos ocultos o segmentos inválidos (HTTP 422 `urn:gia:problem:invalid-storage-key`) y validando extensiones soportadas (`.svs`, `.png`, `.jpg`, `.jpeg`, arrojando HTTP 422 `urn:gia:problem:unsupported-image-format` ante formatos no admitidos).
     - Extensión de `IStorageService` y `PhysicalStorageService` con `SaveFileAsync` (escritura asíncrona por streaming con buffer de 80 KB sin cargar archivos WSI completos en RAM) y `DeleteFile` para limpieza y rollback físico.
  3. **Endpoint de Subida Simple y Múltiple de Imágenes (`ImagesController.UploadImages`):**
     - Implementación de `POST /api/v1/datasets/{datasetId}/images/upload` (`multipart/form-data`, campo `files`) accesible para cualquier usuario autenticado (`[Authorize]`, tanto `admin` como `annotator`), al igual que `POST /api/v1/datasets/{datasetId}/images` y `GET /api/v1/storage/files`.
     - Configuración de `[DisableRequestSizeLimit]` y `[RequestFormLimits(MultipartBodyLengthLimit = 10 GB)]` en ASP.NET Core, y `client_max_body_size 10G; proxy_request_buffering off;` en `deploy/gateway/nginx.conf` junto con montaje de lectura/escritura `/data/images` en `compose.yaml`.
     - Garantía de **atomicidad física y transaccional**: cada archivo subido se escribe en `/data/images/datasets/{datasetId}/...`, se inspecciona con el servicio `tiles` (`GET /internal/v1/inspect`) para obtener dimensiones de nivel 0 (`WidthL0`, `HeightL0`), niveles de pirámide (`LevelCount`) y resolución micrométrica (`MppX`, `MppY`), y se persiste en una única transacción de PostgreSQL. Si cualquier archivo del lote falla en la inspección, se eliminan del disco todos los archivos subidos en esa petición.
     - Actualización del contrato OpenAPI (`contract/openapi/api.v1.yaml`) documentando el endpoint `uploadImages`.
  4. **Suite de Pruebas Automatizadas (`StorageAndWsiTests` en `Pps.Domain.Tests`):**
     - Incorporación de pruebas unitarias y de integración de controlador con SQLite en memoria (43/43 tests en verde): subida individual y múltiple, asociación exclusiva al dataset consultado, rechazo de duplicados (`409 already-registered`), rollback físico ante archivos corruptos, validación de geometrías en coordenadas WSI de nivel 0 (`46.000 × 32.914` y `100.000 × 80.000`) y aislamiento multi-revisor con verificación de `403 Forbidden` (`urn:gia:problem:forbidden`) al intentar modificar o eliminar anotaciones ajenas incluso con rol `admin`.
  5. **Verificación en Vivo sobre Docker Compose con Archivos WSI Reales:**
     - Despliegue integrado de `gia-db` (PostgreSQL 18), `gia-api` (.NET 10 LTS), `gia-tiles` (FastAPI + OpenSlide) y `gia-gateway` (Nginx).
     - Prueba en vivo con el usuario `annotator`: subida individual de `CMU-1-Small-Region.svs` (2220 × 2967 px, completada en 393 ms) y subida múltiple simultánea de `prueba-1376x1020.png` + `CMU-1-JP2K-33005.svs` (132,5 MB, 46.000 × 32.893 px, 3 niveles, `mpp = 0.499`, completada en 1646 ms).
     - Verificación de consulta por dataset (`GET /api/v1/datasets/3/images` retornando las 3 imágenes registradas y `GET /api/v1/datasets/4/images` retornando 0), descarga de descriptor DZI y teselas JPEG protegidas por `auth_request` (`200 OK` con sesión, `401 Unauthorized` sin sesión), persistencia de polígonos en coordenadas de nivel 0 (`x > 41.200 px`) y rechazo `403 Forbidden` ante intento de borrado cruzado por otro usuario.
- **Entregables / Commits:**
  - Archivos creados o modificados:
    - `api/src/Pps.Domain/Images/IStorageService.cs`
    - `api/src/Pps.Domain/Images/StorageKeyValidator.cs`
    - `api/src/Pps.Infrastructure/Storage/PhysicalStorageService.cs`
    - `api/src/Pps.Infrastructure/Persistence/AppDbContext.cs`
    - `api/src/Pps.Infrastructure/Pps.Infrastructure.csproj`
    - `api/src/Pps.Api/Common/Errors/GiaExceptions.cs`
    - `api/src/Pps.Api/Controllers/Images/ImagesController.cs`
    - `api/src/Pps.Api/Controllers/Storage/StorageController.cs`
    - `api/src/Pps.Api/Program.cs`
    - `api/tests/Pps.Domain.Tests/Pps.Domain.Tests.csproj`
    - `api/tests/Pps.Domain.Tests/StorageAndWsiTests.cs`
    - `contract/openapi/api.v1.yaml`
    - `deploy/gateway/nginx.conf`
    - `compose.yaml`
    - `docs/BITACORA_PPS2.md`
- **Dificultades y soluciones:**
  - Los archivos `.svs` reales superan los límites por defecto de ASP.NET Core (30 MB en Kestrel / 128 MB en formularios multiparte) y de Nginx (1 MB). Se deshabilitó el buffering de petición en el proxy (`proxy_request_buffering off; client_max_body_size 10G;`) y se configuró streaming directo a `FileStream` en la API, logrando subir e inspeccionar un archivo WSI de 132,5 MB en 1,6 segundos sin picos de memoria.
- **Estado:** Completado.

---

### Día 8: Cierre de Pruebas de Rendimiento I2, Modelo de Persistencia e Implementación del Importador CRIC (ADR-09)
- **Fecha:** 28/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 52 horas)
- **Módulo:** Rendimiento y Calidad en WSI (Cierre I2) / Importación por Adaptadores (Épica E8, ADR-09)
- **Actividades realizadas:**
  1. **Consolidación de Escenarios de Calidad y Benchmarks WSI (QS-1 a QS-4 y QS-8):**
     - Creación y ejecución de `scripts/bench-tiles.py` sobre `CMU-1-JP2K-33005.svs` (WSI de 46.000 × 32.893 px, 132,5 MB) desplegada en Docker Compose a través de la pasarela Nginx con `auth_request`:
       - Apertura en frío (GET DZI): **11,62 ms** (objetivo contractual QS-4 $\le$ 1.000 ms).
       - 500 peticiones aleatorias de teselas con 8 workers concurrentes: throughput de **149 teselas/s**, latencia p50 de **39,7 ms**, p90 de **104,6 ms** y p95 de **110,9 ms** (superando con holgura el objetivo QS-4 $\le$ 150 ms).
       - Confidencialidad (QS-8): 401 Unauthorized sin cookie en DZI y teselas, y 404 Not Found ante solicitudes de imágenes asociadas no autorizadas (`/macro` y `/label`).
     - Creación de suite de estrés y volumen `WsiPerformanceAndStressTests.cs` en xUnit:
       - Rendimiento algorítmico: validación y cálculo de BBox/área de Gauss sobre 1.000 geometrías WSI en menos de 1 ms.
       - Creación masiva persistida de 200 anotaciones en coordenadas de nivel 0 en 414 ms (2,07 ms/anotación) y consultas filtradas por autor (`author=me`) en 37 ms.
  2. **Motor de Conversión `cricPointToBox` y Procedencia Contractual (`Pps.Domain.Import`):**
     - Implementación de `CricPointToBoxConverter` con cálculo de centro, lado configurable `boxSize` (por defecto 100 px), recorte exacto a los límites de la imagen y discriminación determinista de `clipped: true/false`.
     - Creación de pruebas unitarias `CricPointToBoxTests` con verificación al 100% contra los casos oficiales de `contract/fixtures/export.json`.
  3. **Modelo de Persistencia para Importaciones (`ImportRecord` / tabla `imports`):**
     - Creación de la entidad `ImportRecord` en el dominio y configuración en `AppDbContext` (columna `report_json` mapeada a `jsonb` en PostgreSQL 18, claves foráneas con eliminación restringida hacia `Dataset` y `User`, e índice compuesto en `(dataset_id, source)`).
     - Generación y aplicación exitosa de la migración EF Core `20261027134318_AddImportsTable`.
     - Implementación de excepciones de dominio y manejo estandarizado RFC 9457 en `GiaExceptionHandler`:
       - Detección de re-importación: HTTP 409 Conflict (`urn:gia:problem:already-imported`) si la fuente ya fue importada en el dataset.
       - Límite de escala: HTTP 422 Unprocessable Entity (`urn:gia:problem:import-too-large`) si el lote supera las 2.000 imágenes (ADR-09).
  4. **Adaptador `CricImporter` y Controlador `ImportsController` (`POST /api/v1/datasets/{datasetId}/imports`):**
     - Implementación del parser polivalente CSV/JSON `CricAnnotationsParser` tolerante a variantes de cabeceras de CRIC (`image_filename`, `cell_id`, `nucleus_x`, `nucleus_y`, `bethesda_system`).
     - Trazabilidad y autoría mediante usuario sintético `import-cric` (`IsSystem = true`, rol `annotator`).
     - Mapeo y catalogación automática de clases Bethesda (NILM, ASC-US, LSIL, ASC-H, HSIL, SCC) con colores institucionales y orden secuencial.
     - Soporte para **simulación atómica con `dryRun: true`** (HTTP 200 OK, inspección técnica y cálculo de advertencias sin escribir ninguna fila en base de datos) y **ejecución atómica transaccional con `dryRun: false`** (HTTP 201 Created dentro de una única transacción de base de datos con generación de `ImportRecord` y asignación de `importId` en el `provenance` de cada figura).
  5. **Verificación Automatizada e Integración de Punta a Punta en Docker Compose:**
     - Suite xUnit en verde (54/54 tests pasando).
     - Implementación del script de prueba integral `scripts/test_cric_import.py` validando todo el ciclo en caliente sobre los contenedores `gia-api` (.NET 10 LTS), `gia-tiles` (FastAPI + OpenSlide), `gia-db` (PostgreSQL 18) y `gia-gateway` (Nginx): simulación `dryRun`, persistencia atómica, consulta de anotaciones importadas, protección contra re-importación 409 y posterior exportación a JSON interno (`gia-annotations` v1.0).
- **Entregables / Commits:**
  - Archivos creados o modificados:
    - `api/src/Pps.Domain/Import/ImportRecord.cs`
    - `api/src/Pps.Domain/Import/ImportModels.cs`
    - `api/src/Pps.Domain/Import/ImportExceptions.cs`
    - `api/src/Pps.Domain/Import/IAnnotationImporter.cs`
    - `api/src/Pps.Domain/Import/CricPointToBoxConverter.cs`
    - `api/src/Pps.Domain/Import/CricAnnotationsParser.cs`
    - `api/src/Pps.Infrastructure/Import/CricImporter.cs`
    - `api/src/Pps.Infrastructure/Persistence/AppDbContext.cs`
    - `api/src/Pps.Infrastructure/Persistence/Migrations/20261027134318_AddImportsTable.cs`
    - `api/src/Pps.Infrastructure/Persistence/Migrations/20261027134318_AddImportsTable.Designer.cs`
    - `api/src/Pps.Infrastructure/Persistence/Migrations/AppDbContextModelSnapshot.cs`
    - `api/src/Pps.Api/Controllers/IO/ImportsController.cs`
    - `api/src/Pps.Api/Common/Errors/GiaExceptions.cs`
    - `api/src/Pps.Api/Common/Errors/GiaExceptionHandler.cs`
    - `api/src/Pps.Api/Program.cs`
    - `api/tests/Pps.Domain.Tests/WsiPerformanceAndStressTests.cs`
    - `api/tests/Pps.Domain.Tests/CricPointToBoxTests.cs`
    - `api/tests/Pps.Domain.Tests/CricImportTests.cs`
    - `scripts/bench-tiles.py`
    - `scripts/test_cric_import.py`
    - `docs/BITACORA_PPS2.md`
- **Dificultades y soluciones:**
  - La serialización de `RectangleGeometry` como tipo estático concreto en el importador omitía el discriminador `"type": "rectangle"` generado por el polimorfismo de `Geometry`, disparando un error 500 al deserializar; se ajustó la serialización explícita tipada a `JsonSerializer.Serialize<Geometry>(...)` asegurando la presencia del discriminador contractual.
  - Al persistir las anotaciones en la transacción final, el recálculo del núcleo a partir del centro de la caja provocaba discrepancias en cajas recortadas en los bordes; se corrigió preservando intacto el núcleo original del registro de origen en la estructura `CricProvenance` y actualizando únicamente el `ImportId` asignado.
- **Estado:** Completado (Cierre definitivo de Incremento I2 y avance de Incremento I3).

---

### Día 9: Módulo de Exportación COCO, Formato Externo e Interoperabilidad (ADR-10, Épica E9)
- **Fecha:** 29/10/2026
- **Horas dedicadas:** 6 horas (Acumulado: 58 horas)
- **Módulo:** Exportación e Interoperabilidad (Épica E9, ADR-10 — Incremento I3)
- **Actividades realizadas:**
  1. **Modelado Contractual de Formato COCO (`Pps.Domain.Export.Coco`):**
     - Definición de records y modelos para el esquema estándar COCO Object Detection (`CocoExportDocument`, `CocoInfo`, `CocoLicense`, `CocoImage`, `CocoAnnotation`, `CocoCategory`) respetando la convención de nomenclatura snake_case para formatos externos (`image_id`, `category_id`, `file_name`, `date_created`, etc.) conforme a ADR-10 y §4.3.
     - Implementación de `CocoGeometryConverter` con conversión estricta y determinista de geometrías de nivel 0:
       - Rectángulos: `bbox` `[x, y, width, height]`, segmentación cerrada de 4 vértices en sentido horario `[[x, y, x+w, y, x+w, y+h, x, y+h]]` y cálculo de área `width * height`.
       - Polígonos: `bbox` `[minX, minY, maxX - minX, maxY - minY]`, segmentación plana `[[x0, y0, x1, y1, ...]]` y cálculo de área mediante el algoritmo de Gauss / cordón de zapato.
       - WSI: coordenadas de nivel 0 de imagen completa sin recortes (P16).
  2. **Servicio de Exportación COCO (`CocoExporter` implementando `IExporter`):**
     - Implementación de `CocoExporter` en `Pps.Infrastructure.Export` sobre PostgreSQL 18 con consultas optimizadas `AsNoTracking()`.
     - Integración con `AuthorsFilterParser` para resolución determinista de filtros de autoría (`me`, `all`, o lista de IDs de usuario).
     - Exclusión automática de anotaciones con borrado lógico (`deleted_at == null`).
     - Mapeo de `file_name` referenciando la clave de almacenamiento (`storage_key`) sin duplicación de imágenes.
     - Serialización UTF-8 con escape relajado (`UnsafeRelaxedJsonEscaping`) y generación de nombres de descarga normalizados `{slug}-coco.json`.
  3. **Despacho Dinámico y Validación en `ExportController` (`GET /api/v1/datasets/{datasetId}/export`):**
     - Refactorización de `ExportController` para inyectar colecciones de exportadores (`IEnumerable<IExporter>`), resolviendo dinámicamente `format=internal` y `format=coco`.
     - Rechazo estricto con HTTP 422 Unprocessable Entity (`urn:gia:problem:unsupported-format`) ante peticiones de formato condicional `yolo`, indicando que su implementación está sujeta a disponibilidad de tiempo (ADR-10).
     - Validación de formatos desconocidos con HTTP 400 (`urn:gia:problem:validation`).
     - Registro de dependencias en el contenedor de servicios de `Program.cs`.
  4. **Suite de Pruebas Automatizadas xUnit (`CocoExportTests` en `Pps.Domain.Tests`):**
     - Pruebas unitarias de conversión geométrica verificando concordancia exacta (al 100%) contra las anotaciones y casos WSI del fixture contractual `contract/fixtures/export.json`.
     - Verificación de exportación completa con SQLite en memoria: metadatos de dataset, orden de categorías por `display_order`, dimensiones WSI, inclusión de imágenes vacías como background, filtrado de anotaciones por autor y omisión de anotaciones borradas lógicamente (61/61 tests de la suite en verde).
     - Pruebas de integración del controlador validando códigos HTTP (200, 400, 422) y cabeceras `Content-Disposition: attachment; filename="{slug}-coco.json"`.
  5. **Script de Verificación de Integración de Punta a Punta:**
     - Creación de `scripts/test_coco_export.py` para comprobación automatizada contra la API desplegada en Docker Compose a través de la pasarela Nginx.
- **Entregables / Commits:**
  - Archivos creados o modificados:
    - `api/src/Pps.Domain/Export/Coco/CocoExportModels.cs`
    - `api/src/Pps.Domain/Export/Coco/CocoGeometryConverter.cs`
    - `api/src/Pps.Infrastructure/Export/CocoExporter.cs`
    - `api/src/Pps.Api/Controllers/IO/ExportController.cs`
    - `api/src/Pps.Api/Program.cs`
    - `api/tests/Pps.Domain.Tests/CocoExportTests.cs`
    - `scripts/test_coco_export.py`
    - `docs/BITACORA_PPS2.md`
- **Dificultades y soluciones:**
  - `RectangleGeometry` declara sus propiedades `X`, `Y`, `Width`, `Height` como tipos que aceptan nulos (`double?`) para soportar la validación de esquemas de ASP.NET Core; se incorporó validación explícita de valores no nulos en `CocoGeometryConverter` previo al desempaquetado de coordenadas.
- **Estado:** Completado.

---

### Día 10 (Planificado para la próxima jornada): Ciclo de Vida y Edición Avanzada de Anotaciones / Preparación de Aceptación I3 (Épica E7, ADR-07)
- **Fecha prevista:** 30/10/2026
- **Módulo:** Anotaciones y Edición (Épica E7, Incremento I3)
- **Tareas a realizar:**
  1. Revisión de endpoints de actualización de geometrías (`PATCH /api/v1/annotations/{id}`): soporte integral para traslación de figuras, modificación de vértices de polígonos y reasignación de clases dentro del dataset.
  2. Verificación de reglas de re-validación espacial (límites de nivel 0, autointersecciones y cálculo de nueva caja envolvente/área) y control estricto de concurrencia optimista (`If-Match` / `ETag`).
  3. Diseño del guion y suite de aceptación integral para el cierre del Incremento I3.
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
