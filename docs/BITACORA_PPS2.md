# Bitácora de Práctica Profesional Supervisada (PPS 2)
**Proyecto:** Gestión, anotación e interoperabilidad de datasets de imágenes médicas  
**Estudiante:** Nahuel  
**Carga horaria total requerida:** 200 horas (40 días hábiles de 5 horas aprox.) — *a confirmar: la arquitectura ([§2.2](arquitectura/01-introduccion-y-restricciones.md)) indica 6 h por día del 19/10 al 03/12/2026; ver [ALINEACION_SCAFFOLDING_PPS2.md](ALINEACION_SCAFFOLDING_PPS2.md)*  
**Repositorio y entorno:** ASP.NET Core (C#), PostgreSQL, Docker & Docker Compose. Versiones y decisiones en la [línea base de arquitectura](arquitectura/README.md); diferencias con el scaffolding inicial en [ALINEACION_SCAFFOLDING_PPS2.md](ALINEACION_SCAFFOLDING_PPS2.md)  

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
- **Nota (17/10/2026):** el plan se alineó con la línea base de arquitectura acordada por los dos (cookie en lugar de JWT, `jsonb` en lugar de PostGIS y NetTopologySuite, .NET 10 y PostgreSQL 18). Falta aplicarlo al código del scaffolding; el detalle está en [ALINEACION_SCAFFOLDING_PPS2.md](ALINEACION_SCAFFOLDING_PPS2.md).

---

### Plantilla de Registro para los Siguientes Días (Semana 1 en adelante)

```markdown
### Día X: [Título breve de la jornada]
- **Fecha:** DD/MM/AAAA
- **Horas dedicadas:** 5 horas (Acumulado: Y horas)
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
