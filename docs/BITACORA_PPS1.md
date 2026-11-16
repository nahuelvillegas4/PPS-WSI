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

### Día 0: Servicio de teselas, visor OpenSeadragon y pasarela Nginx (previo al período)
- **Fecha:** 17/10/2026
- **Horas dedicadas:** trabajo previo al inicio del período (no se suma al acumulado)
- **Módulo:** Teselas / Visor / Despliegue
- **Actividades realizadas:**
  1. Alineación del scaffolding con la línea base de arquitectura y creación del contexto inicial de arquitectura; el `.env` y `/data/` quedan fuera de Git (ADR-12).
  2. Servicio `tiles/` (FastAPI con OpenSlide): descriptor DZI, teselas JPEG, inspección de imágenes y errores `application/problem+json`, con pruebas.
  3. Script que genera la imagen de prueba del caso D2 (PNG de 1.376 × 1.020).
  4. Visor de imágenes con OpenSeadragon detrás de la interfaz `ImageViewer`, con conversión de coordenadas a nivel 0 y aviso de fallos de teselas.
  5. Pasarela Nginx de origen único (SPA, `/api/` y `/tiles/` con `auth_request`) y servicios `tiles` y `gateway` en el `compose.yaml`.
  6. Prueba de punta a punta en Docker y luego con sesión real tras integrar el Día 2 de Nahuel; PR #1 (`feat/ver-teselas-en-visor`) integrado a `main`.
- **Entregables / Commits:**
  - `371ef60`, `c206d18`, `576e736` (base y alineación); `34160fe`, `dc5f93c` (teselas); `ed20686` (imagen de prueba); `a306d7d` (visor); `7e90841`, `75c9ce1` (pasarela y compose); `7967dbb`, `08d3449` (pruebas documentadas); `f1b83b4` y `57b24bd` (integración).
  - Archivos: `tiles/*`, `web/src/features/viewer/*`, `deploy/gateway/*`, `compose.yaml`, `scripts/make_sample_image.py`, `deploy/README.md`.
- **Dificultades y soluciones:**
  - `vitest 5.0.2` fallaba al instalarse con npm 11.5.2 (error del resolutor); se usó la 5.0.5.
  - `API_PORT=8080` del `.env` chocaba con el puerto de la pasarela; se movió a 8081 en `.env.example`.
  - Con la API real, una imagen inexistente devolvía 500 en `tile-access`; Nahuel lo corrigió para responder 403 (`b46de58`, 18/10).
- **Estado:** Completado.

---

### Día 1: Integración con la API y archivos ignorados
- **Fecha:** 19/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 5 horas)
- **Módulo:** Integración / Repositorio
- **Actividades realizadas:**
  1. Integración de `main` con la rama de trabajo, con la API de Nahuel (ingreso, usuarios y proyectos) ya incorporada.
  2. Reglas de ignorado de Git para archivos locales.
- **Entregables / Commits:**
  - `673da21`, `e60c2de` (archivos ignorados) y `2138a62` (merge de `main`).
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 2: Contraste de los contratos con lo implementado
- **Fecha:** 20/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 10 horas)
- **Módulo:** Teselas / Visor / Documentación
- **Actividades realizadas:**
  1. Revisión de `tiles.v1.yaml` y `api.v1.yaml` frente al servicio de teselas y a la pasarela.
  2. Contraste del direccionamiento DZI y de las conversiones de coordenadas del visor con los casos del contrato (`dzi.json`, casos C1 a C3).
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 3: Integración del servicio de teselas con el registro de imágenes
- **Fecha:** 21/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 15 horas)
- **Módulo:** Teselas / Integración
- **Actividades realizadas:**
  1. Pruebas del endpoint interno `/internal/v1/inspect` del servicio de teselas, que la API consume al explorar el almacenamiento y registrar imágenes (épica E4 de Nahuel).
  2. Pruebas del camino de teselas con imágenes registradas por la API.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 4: Visor sobre distintos tamaños de imagen y errores de teselas
- **Fecha:** 22/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 20 horas)
- **Módulo:** Visor
- **Actividades realizadas:**
  1. Pruebas manuales del visor con imágenes de distintos tamaños, con atención al zoom y a la posición bajo el cursor.
  2. Revisión del aviso de fallos de teselas del visor (ventana de 5 segundos) y de lo que ve la persona usuaria cuando falla la carga.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 5: Revisión de la pasarela y la autorización de teselas
- **Fecha:** 23/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 25 horas)
- **Módulo:** Despliegue
- **Actividades realizadas:**
  1. Revisión de la pasarela: `auth_request` con respuestas 2xx, 401 y 403, rutas `/internal/` inaccesibles desde el navegador y cabeceras de seguridad.
  2. Actualización de `deploy/README.md` con lo observado.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 6: Ingreso y catálogo de la SPA contra la pasarela
- **Fecha:** 26/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 30 horas)
- **Módulo:** Interfaz
- **Actividades realizadas:**
  1. Revisión de la pantalla de ingreso y del catálogo de datasets e imágenes que Nahuel integró el 24/10, probadas contra la pasarela con la cookie `gia_session`.
  2. Seguimiento de la corrección de codificación y acentos del ingreso, aplicada por Nahuel el 26/10 (`f4ad37b`).
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 7: Servicio de teselas con una WSI (.svs)
- **Fecha:** 27/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 35 horas)
- **Módulo:** Teselas
- **Actividades realizadas:**
  1. Pruebas del servicio de teselas con una imagen WSI, tras el soporte de subida y WSI de la API (`173575a`).
  2. Revisión de los tiempos de respuesta de teselas con los benchmarks WSI de `scripts/bench-tiles.py` (`9dac6d7`).
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 8: Medición de rendimiento del visor y las teselas
- **Fecha:** 28/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 40 horas)
- **Módulo:** Teselas / Visor
- **Actividades realizadas:**
  1. Análisis de los resultados de los benchmarks de teselas sobre WSI y de la respuesta del visor al hacer zoom.
  2. Revisión de la exportación COCO y del ciclo de vida de anotaciones de la API (`518630f`, `5dc62d9`) para ver qué debe soportar el visor cuando lleguen las anotaciones.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 9: Pedido del profesor: roles por proyecto y subida de imágenes
- **Fecha:** 29/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 45 horas)
- **Módulo:** Diseño / Documentación
- **Actividades realizadas:**
  1. Relevamiento del pedido del profesor: el administrador global crea proyectos y cuentas y asigna roles; cada persona ve solo sus proyectos; se pueden subir imágenes desde el navegador.
  2. Primer borrador del modelo de dos niveles de roles (global: `admin` y `user`; de proyecto: `admin`, `annotator` y `viewer`).
- **Entregables / Commits:**
  - Sin commits propios en la jornada; el borrador se publica el 31/10.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 10: Borradores del contrato 0.2.0 y de los ADR 15 a 17
- **Fecha:** 30/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 50 horas)
- **Módulo:** Contrato / Arquitectura
- **Actividades realizadas:**
  1. Borrador del contrato 0.2.0: endpoints de miembros, `myRole` en proyectos y consulta de usuario por identificador.
  2. Borradores de ADR-15 (roles y membresía), ADR-16 (autorización y sesión) y ADR-17 (subida de imágenes desde el navegador), en la rama `feat/contrato-roles-por-proyecto`.
- **Entregables / Commits:**
  - Sin commits propios en la jornada; los borradores se publican el 31/10.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 11: Contrato 0.2.0, matriz de autorización y ADR 15 a 17
- **Fecha:** 31/10/2026
- **Horas dedicadas:** 5 horas (Acumulado: 55 horas)
- **Módulo:** Contrato / Arquitectura
- **Actividades realizadas:**
  1. Publicación del contrato 0.2.0 con roles por proyecto, miembros y subida documentada.
  2. Matriz de autorización compartida (`contract/fixtures/authorization-matrix.json`, 40 operaciones) y chequeo obligatorio en `scripts/check_contract.py`.
  3. Publicación de ADR-15, ADR-16 y ADR-17.
  4. Revisión nativa de los commits del contrato: 0 bloqueantes y 17 hallazgos informativos, corregidos en un lote que endurece el chequeo de versión, escalera de roles y respuestas 401/403/404.
- **Entregables / Commits:**
  - `97255fd`, `3e5ce14`, `bade143`, `48e5ed2`.
- **Dificultades y soluciones:**
  - `pip` fallaba con `CERTIFICATE_VERIFY_FAILED`; se resolvió pasando a `pip --cert` los certificados del almacén de Windows, sin desactivar la verificación.
- **Estado:** Completado.

---

### Día 12: Autorización por proyecto, miembros, usuarios y subida de imágenes
- **Fecha:** 01/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 60 horas)
- **Módulo:** Interfaz / Acceso
- **Actividades realizadas:**
  1. Dominio de acceso por proyecto, tabla `project_members` y migración `AddProjectMembership` sin relleno de membresías.
  2. Filtro global de autorización, endpoints de miembros, `GET /projects` con `myRole` y `tile-access` por membresía.
  3. SPA: permisos por rol, pantallas de usuarios y miembros y modal de subida de imágenes.
  4. Verificación: 292 pruebas de la API en Docker, 255 de la web, `check_contract.py` con 40 operaciones y 78 chequeos contra el stack real con login; 8 pasos de interfaz en el navegador sin defectos graves.
- **Entregables / Commits:**
  - `7a11164`, `871f574`, `228f9e5`, `8ccc386`, `2584cfc`.
- **Dificultades y soluciones:**
  - La migración no rellena membresías: los proyectos existentes solo los ve el administrador global hasta que se asignen miembros.
  - La prueba en el navegador detectó defectos de severidad baja en la interfaz; en `2584cfc` se corrigieron los mensajes de validación en usuarios, un error viejo en miembros y los estados vacíos.
- **Estado:** Completado.

---

### Día 13: Guía interactiva del sistema (/gia)
- **Fecha:** 02/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 65 horas)
- **Módulo:** Interfaz / Documentación
- **Actividades realizadas:**
  1. Ruta `/gia` de la SPA, solo para el administrador global, con índice, pestañas, bloques y modo presentación.
  2. Diagramas Mermaid con carga diferida (arquitectura, flujos, datos y permisos con las 40 operaciones de la API).
  3. Paradas de requisitos, calidad, decisiones (ADR), avance y estado final, y pruebas transversales contra el repositorio.
  4. Cuatro rondas de corrección para que la guía afirme solo lo que consta en el repositorio.
- **Entregables / Commits:**
  - `7217225`, `343dc61`, `eede499`, `5e3040e`, `da2229e`, `1821bdc`, `6a7490c`, `550d952`, `b8e46b1`, `ef00b31`, `f0d9e01`, `39f43b0`, `54ea7af`, `fddd201`.
- **Dificultades y soluciones:**
  - Mermaid agranda el paquete inicial de la SPA; se cargó de forma diferida para no penalizar el arranque ni el visor.
- **Estado:** Completado.

---

### Día 14: Cierre de la guía y preparación de la presentación al profesor
- **Fecha:** 03/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 70 horas)
- **Módulo:** Documentación
- **Actividades realizadas:**
  1. Revisión de la auditoría de la guía `/gia` contra el repositorio.
  2. Preparación de lo que se muestra al profesor: estado de los ADR 15 a 17 (propuestos, a la espera de la aprobación de la supervisión) y alcance ejecutado frente al inicial.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 15: Subida de imágenes desde el navegador
- **Fecha:** 04/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 75 horas)
- **Módulo:** Interfaz
- **Actividades realizadas:**
  1. Pruebas del modal de subida y de su cola con imágenes de distintos formatos y tamaños, sobre un dataset de un proyecto.
  2. Revisión de los mensajes de error de la subida según el rol de la persona usuaria.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 16: Teselas con autorización por membresía
- **Fecha:** 05/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 80 horas)
- **Módulo:** Despliegue / Teselas
- **Actividades realizadas:**
  1. Pruebas de `tile-access` con sesión real: la imagen solo se sirve a quien es miembro del proyecto o administrador global.
  2. Verificación de que sin sesión el pedido de teselas responde 401.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 17: Preparación de los cambios para la revisión cruzada
- **Fecha:** 06/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 85 horas)
- **Módulo:** Documentación / Repositorio
- **Actividades realizadas:**
  1. Revisión de los commits de roles por proyecto y subida de imágenes para entregarlos a Nahuel en un pull request.
  2. Registro de los puntos abiertos: aprobación de la supervisión, revisión cruzada del código de la API y sesión de la guía.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 18: Seguimiento de la integración con la API
- **Fecha:** 09/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 90 horas)
- **Módulo:** Integración
- **Actividades realizadas:**
  1. Contraste de la SPA con los cambios de la API de Nahuel posteriores a la incorporación de roles por proyecto.
  2. Pruebas de ingreso, usuarios y miembros con el stack completo en Docker.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 19: Lectura de los manuales operativos de la PPS 2
- **Fecha:** 10/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 95 horas)
- **Módulo:** Documentación
- **Actividades realizadas:**
  1. Lectura de los manuales que publicó Nahuel (despliegue y operación, importación CRIC, exportación de formatos y guion de aceptación) y contraste con el código (`b832d3b`).
  2. Detección de diferencias entre los manuales y la configuración real, que se corrigen más adelante.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 20: Guion de aceptación sobre una instalación limpia
- **Fecha:** 11/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 100 horas)
- **Módulo:** Despliegue
- **Actividades realizadas:**
  1. Ensayo del guion de aceptación con Docker Compose desde cero: base, API, teselas y pasarela.
  2. Revisión de los pasos de ingreso y de carga de imágenes del guion.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 21: Visor con imágenes subidas desde el navegador
- **Fecha:** 12/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 105 horas)
- **Módulo:** Visor
- **Actividades realizadas:**
  1. Pruebas del visor con imágenes cargadas desde el modal de subida.
  2. Observación de una anomalía: al hacer zoom, el visor mostraba otra imagen distinta de la cargada.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Pendiente de diagnóstico; se resuelve el 16/11.
- **Estado:** En progreso.

---

### Día 22: Acceso con el administrador inicial
- **Fecha:** 13/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 110 horas)
- **Módulo:** Interfaz / Despliegue
- **Actividades realizadas:**
  1. Revisión de cómo se siembra el administrador inicial (`ADMIN_USERNAME` y `ADMIN_PASSWORD`) y cómo se configura el ingreso.
  2. Contraste de lo que dicen el README y los manuales con lo que hace el código.
- **Entregables / Commits:**
  - Sin commits propios en la jornada.
- **Dificultades y soluciones:**
  - Sin dificultades relevantes.
- **Estado:** Completado.

---

### Día 23: Causa de la anomalía del visor y recuperación del acceso
- **Fecha:** 16/11/2026
- **Horas dedicadas:** 5 horas (Acumulado: 115 horas)
- **Módulo:** Visor / Despliegue
- **Actividades realizadas:**
  1. Diagnóstico de la anomalía del visor: la variante de desarrollo sin ingreso (`compose.dev-sin-login.yaml`) montaba `tiles-auth-sin-login.conf` en la pasarela, que fija `samples/scanslide.tiff` para toda imagen. El visor mostraba la imagen subida al abrir y, al hacer zoom, pedía teselas de ese archivo.
  2. Retiro de la variante de desarrollo: se descartó el cambio local, se recreó la pasarela solo con `compose.yaml` y se comprobó que `/tiles/v1/images/1.dzi` sin sesión responde 401.
  3. Recuperación del ingreso: el administrador ya existía y la API no actualiza su contraseña al arrancar, por lo que se restableció su hash en la base, sin perder datos. El ingreso quedó verificado con la API.
  4. Detección de que el README y los manuales indican `admin@gia.local`, cuando el usuario real es `admin`; la corrección queda pendiente.
- **Entregables / Commits:**
  - Sin commits de código; el cambio descartado era local y la contraseña se cambió en la base.
- **Dificultades y soluciones:**
  - El administrador inicial solo se crea si no existe, por eso cambiar `ADMIN_PASSWORD` en el `.env` no tuvo efecto sobre una base ya sembrada.
- **Estado:** Completado.

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
