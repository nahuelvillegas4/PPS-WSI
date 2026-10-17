# Bitácora de Práctica Profesional Supervisada (PPS 2)
**Proyecto:** Gestión, anotación e interoperabilidad de datasets de imágenes médicas  
**Estudiante:** Nahuel  
**Carga horaria total requerida:** 200 horas (40 días hábiles de 5 horas aprox.)  
**Repositorio y entorno:** .NET 8 (C#), PostgreSQL / PostGIS, Docker & Docker Compose  

---

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
