# Bitácora de Práctica Profesional Supervisada (PPS 1)
**Proyecto:** Plataforma de anotación de imágenes médicas (visor WSI, servicio de teselas y frontend)  
**Estudiante:** Gino Paolo Tombesi (legajo 95345)  
**Período y carga horaria:** 5 horas por día, del 19/10 al 16/12/2026 ([arquitectura §2.2](arquitectura/01-introduccion-y-restricciones.md))  
**Repositorio y entorno:** React + TypeScript (Vite), FastAPI con OpenSlide, OpenSeadragon, Nginx, Docker & Docker Compose. Versiones y decisiones en la [línea base de arquitectura](arquitectura/README.md)  

El formato es el mismo que el de la [bitácora de la PPS 2](BITACORA_PPS2.md).

---

## Estructura General del Plan de Trabajo

Plan por incrementos de la [arquitectura (§13)](arquitectura/06-organizacion-y-roadmap.md): el orden es fijo y las duraciones son indicativas. La semana 1 empieza el lunes 19/10/2026. Cada incremento termina con algo demostrable sobre el Compose integrado.

| Semana | Incremento | Eje principal (PPS 1) | Hito demostrable |
|---|---|---|---|
| **1** (19/10) | I0 · Base | Repositorio, CI y Compose con los cuatro servicios en versión «hola mundo»; pasarela Nginx; contenedores de la PPS 1 desde el inicio; contrato v0.1 acordado | `docker compose up` desde cero en las dos máquinas; CI en verde |
| **2–3** (26/10 y 02/11) | I1 · Esqueleto de punta a punta | Servicio de teselas con DZI y `auth_request`; SPA con ingreso; `SimpleImageViewer`; herramienta de rectángulo; casos de coordenadas del contrato | `smoke.sh` recorre el camino completo en la CI; casos de coordenadas en verde |
| **3–4** (02/11 y 09/11) | I2 · WSI, polígonos y conjuntos | `OsdImageViewer` sobre una WSI (SVS); herramienta de polígono; pantallas de clases y de conjuntos por usuario; contrato 1.0 | Anotación en WSI persistida en nivel 0; QS-1 a QS-4 y QS-8 medidos |
| **5–6** (16/11 y 23/11) | I3 · Edición, importación y exportación | Mover vértices y figuras, cambiar clase y borrar; pantallas de importación y exportación | Guion de aceptación de la PPS 2 de punta a punta en una instalación limpia |
| **7** (30/11) | I4 · Aceptación de la PPS 2 | Correcciones del frontend contra la API congelada; apoyo al traspaso de conocimiento | Aceptación de PPS 2 §7 (cierra el 03/12) |
| **7–9** (30/11, 07/12 y 14/12) | I5 · Cierre de la PPS 1 | Pantallas de gestión completas; despliegue en el servidor o en la máquina virtual acordada; manuales; backlog | Aceptación de PPS 1 §8 en el servidor; informe final y backlog priorizado |

---

## Registro Diario de Actividades

*Sin entradas todavía. Completar al cierre de cada jornada con la plantilla de abajo.*

---

### Plantilla de Registro

```markdown
### Día X: [Título breve de la jornada]
- **Fecha:** DD/MM/AAAA
- **Horas dedicadas:** 5 horas (Acumulado: Y horas)
- **Módulo:** [Teselas / Visor / Editor / Interfaz / Despliegue / Documentación / etc.]
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
