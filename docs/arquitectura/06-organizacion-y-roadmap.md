## 12. Organización del trabajo

### 12.1 Un solo repositorio

Cumple PPS 2 §1 y el objetivo de calidad 2: se clona un repositorio y se trabaja sobre él (ADR-13).

```text
gia-anotador/
├── api/          ASP.NET Core · PPS 2
├── tiles/        FastAPI + OpenSlide · PPS 1
├── web/          React + TypeScript · PPS 1
├── contract/     OpenAPI, JSON Schema y casos numéricos · ambos
├── deploy/       gateway (Nginx) y compose.server.yaml · ambos
├── docs/         arquitectura, ADR, manuales y guiones de prueba · ambos
├── scripts/      fetch-samples, smoke, check_contract, backup-db · ambos
├── data/         imágenes de prueba descargadas (ignorada por Git)
├── compose.yaml
├── .env.example
├── .editorconfig · .gitattributes
└── README.md     de cero a funcionando en cinco comandos
```

Cada módulo tiene su propio README con tres respuestas: cómo se corre, cómo se prueba y dónde se toca cada cosa. El archivo `CODEOWNERS` hace explícito el reparto y obliga a la revisión del dueño:

```text
/api/        @usuario-pps2
/tiles/      @usuario-pps1
/web/        @usuario-pps1
/contract/   @usuario-pps1 @usuario-pps2
/deploy/     @usuario-pps1 @usuario-pps2
/docs/       @usuario-pps1 @usuario-pps2
```

### 12.2 Flujo de Git y revisión

- **Trunk-based.** `main` siempre funciona y está protegida: PR obligatorio, CI en verde y aprobación del dueño de cada carpeta tocada.
- **Ramas cortas** (dos días como máximo) con nombre `tipo/modulo-descripcion`, por ejemplo `feat/web-herramienta-poligono`.
- **Fusión por squash** y mensajes con Conventional Commits: el tipo en inglés, por convención, y la descripción en español. `feat(api): …`, `fix(tiles): …`, `docs(adr): …`, `feat(contract): …`.
- **PR chicos** (unas 400 líneas como referencia, sin contar código generado) con una plantilla que recuerda la Definición de Terminado y pregunta por el impacto en el contrato.
- **Revisión cruzada siempre.** Además de detectar errores, reparte el conocimiento: si uno falta, el otro puede tocar ese código (R11).

### 12.3 Convenciones de código

| Lenguaje | Formato y análisis | Reglas mínimas |
|---|---|---|
| Python (`tiles/`) | ruff (formato y análisis) | Tipado con anotaciones y chequeo estático en la CI (mypy o pyright) |
| TypeScript (`web/`) | ESLint + Prettier | `strict: true`, `noUncheckedIndexedAccess`; reglas de dependencias entre carpetas (§5.2) |
| C# (`api/`) | `.editorconfig` + `dotnet format` | Nullable habilitado; advertencias tratadas como errores |

Identificadores y código en inglés; documentación, mensajes para el usuario y ADR en español.

### 12.4 Integración continua

GitHub Actions (o su equivalente en GitLab si la plataforma institucional lo exige, P21). Jobs con filtro por ruta, todos obligatorios para fusionar:

| Job | Se activa con cambios en | Qué hace |
|---|---|---|
| `tiles` | `tiles/`, `contract/` | ruff, chequeo de tipos y pytest, con OpenSlide real |
| `web` | `web/`, `contract/` | Generación de tipos desde el contrato, ESLint, `tsc`, Vitest y build |
| `api` | `api/`, `contract/` | Build, pruebas con Testcontainers y comparación de la OpenAPI generada con el contrato |
| `contract` | `contract/`, `scripts/` | `check_contract.py` y compilación estricta de los tipos generados |
| `compose-smoke` | `api/`, `tiles/`, `web/`, `deploy/`, `compose.yaml` | Build de las imágenes, `docker compose up` y `scripts/smoke.sh` |

Objetivo: menos de 10 minutos por PR. Si la CI es lenta, se la saltea; si se la saltea, no protege nada.

### 12.5 Definición de Listo y Definición de Terminado

**Una historia está lista para empezar (DoR) si:**

- tiene criterios de aceptación verificables, en la forma Dado / Cuando / Entonces;
- cita su épica (§14), la sección del enunciado y el ADR que la respaldan;
- declara su impacto en el contrato: ninguno, compatible o incompatible;
- tiene datos de prueba y dependencias resueltas o simuladas;
- entra en dos días de trabajo; si no, se divide.

**Una historia está terminada (DoD) si:**

- está en `main` a través de un PR revisado por la otra persona, con la CI en verde;
- cada criterio de aceptación tiene una prueba automatizada o un paso del guion que lo demuestra;
- si tocó el contrato, `contract/` está actualizado, con la versión subida y la aprobación de ambos;
- funciona en un Compose limpio (`docker compose up` más la prueba de humo);
- la documentación está al día: README del módulo, manual y, si hubo una decisión, su ADR;
- no agrega secretos ni datos sensibles al repositorio.

### 12.6 Tablero y ritmo

Tablero Kanban en GitHub Projects con cinco columnas: Backlog → Lista → En curso → En revisión → Hecho. Límite de trabajo en curso: dos historias por persona. Etiquetas por PPS, por épica (E1 a E11) y por tipo; hitos = incrementos (I0 a I5). Reunión semanal con la supervisión, con demostración sobre el Compose integrado (frecuencia y canal a confirmar, P24); sincronización breve entre nosotros dos o tres veces por semana.

### 12.7 Cambios de alcance

1. Se abre un issue «cambio de alcance» con el motivo y el impacto (horas, épicas, contrato).
2. Se propone qué se retira a cambio, con esfuerzo comparable (PPS 1 §10) y preservando una entrega independiente y útil (PPS 2 §9).
3. La supervisión aprueba o rechaza.
4. Si se aprueba: ADR nuevo, actualización de §13 y §14, y lo retirado pasa al backlog de futuras PPS.

### 12.8 Cómo avanzamos en paralelo sin bloquearnos

| Quién espera | Qué le falta | Cómo sigue sin bloquearse |
|---|---|---|
| La SPA | La API | Tipos generados desde la OpenAPI y mocks desde el día 1 (MSW en el navegador o Prism como servidor) |
| El editor | El visor de WSI | `SimpleImageViewer` sobre PNG, con los mismos casos numéricos que el visor real |
| La API | El servicio de teselas | `IImageInspector` falso que devuelve los metadatos de los casos del contrato |
| Los tres módulos | Datos reales | Casos del contrato, una PNG generada y una WSI simulada en las pruebas |
| La aceptación de la PPS 2 | La integración | Compose integrado desde I0 y ensayo de aceptación en I3 |

## 13. Roadmap por incrementos

Semanas relativas: la semana 1 es la primera semana de trabajo conjunto. **El orden es fijo; la duración es indicativa.** Cada incremento termina con algo demostrable sobre el Compose integrado.

| Incremento | Semanas | Objetivo | Criterio de salida |
|---|---|---|---|
| I0 · Base | 1 | Repositorio, CI y Compose con los cuatro servicios y la pasarela en versión «hola mundo»; contrato v0.1 acordado | `docker compose up` desde cero en las dos máquinas; CI en verde; este documento revisado por la supervisión |
| I1 · Esqueleto de punta a punta | 2–3 | Un camino feo pero completo: ingresar → registrar una PNG → verla por DZI con `auth_request` → dibujar un rectángulo → guardarlo → recargarlo → exportar el JSON interno | `smoke.sh` recorre todo el camino en la CI; casos de coordenadas en verde con `SimpleImageViewer` |
| I2 · WSI, polígonos y conjuntos | 3–4 | SVS por el mismo camino; herramienta de polígono; clases por dataset; conjuntos por usuario; contrato 1.0 | QS-1 a QS-4 y QS-8 medidos; anotación en WSI persistida en nivel 0; 403 sobre anotaciones ajenas |
| I3 · Edición, importación y exportación | 5–6 | Mover vértices, mover figuras, cambiar clase y borrar; importación de CRIC con `dryRun`; exportación COCO; ensayo de aceptación de la PPS 2 | Guion de aceptación de la PPS 2 ejecutado de punta a punta en una instalación limpia |
| I4 · Aceptación de la PPS 2 | 7, antes del cierre de la PPS 2 | Correcciones; manuales de la API, la importación y la exportación; API congelada y documentada | Aceptación de PPS 2 §7; traspaso de conocimiento registrado |
| I5 · Cierre de la PPS 1 | 7–9 | Pantallas de gestión completas; despliegue en el servidor o en la máquina virtual acordada; manuales; backlog | Aceptación de PPS 1 §8 en el servidor; informe final y backlog priorizado |

**Qué se adelanta respecto de las propuestas** (posiciones según los cronogramas de cada propuesta, de 9 semanas en la PPS 1 y 7 en la PPS 2):

| Tarea | Dónde estaba | Dónde queda |
|---|---|---|
| Contenedores de la PPS 1 | Semana 8, después del cierre de la PPS 2 | I0 |
| Docker Compose integrado (PPS 2) | Semana 7 | I0 |
| Ingreso | Semana 3 (API) y semana 6 (interfaz) | I1, en versión mínima de los dos lados |
| Lectura y escritura de la API desde el frontend | Semana 6 | I1 |
| Endpoint de anotaciones | Semana 4 | I1 (rectángulo) e I2 (polígono) |
| Exportación del JSON interno | Semana 6 | I1, en versión mínima |
| Contrato | Versión 1.0 en la semana 4 | v0.1 en I0 y 1.0 al cierre de I2 |

## 14. Mapa de épicas y trazabilidad

Cada épica agrupa historias de un solo dominio. Una historia tiene un único dueño aunque la épica sea compartida.

| Épica | Contenido | Dueño | Enunciado | ADR | Verificación |
|---|---|---|---|---|---|
| E1 Plataforma y entrega | Repositorio, CI, Compose, pasarela y scripts | Ambos | PPS 1 §3.8, PPS 2 §3.9 | 01, 11, 13, 14 | QS-5, prueba de humo |
| E2 Autenticación y usuarios | Cookie, administrador inicial, altas (API); pantalla de ingreso (SPA) | PPS 2 · interfaz PPS 1 | PPS 1 §4, PPS 2 §3.3 | 04 | QS-7, QS-8 |
| E3 Catálogo | Proyectos, datasets y clases | PPS 2 · interfaz PPS 1 | PPS 1 §3.1, PPS 2 §3.1–3.2 | 07 | Pruebas de integración |
| E4 Registro de imágenes | Inspección (teselas), registro (API) y pantalla | PPS 1 y PPS 2 | PPS 1 §3.2, PPS 2 §3.1 | 02, 03 | Casos D1 y D2 |
| E5 Teselas y visor | DZI, `OsdImageViewer`, `SimpleImageViewer` | PPS 1 | PPS 1 §3.3, §4, §5 | 02, 06 | QS-1, QS-4 |
| E6 Editor en el navegador | Herramientas, capa SVG, edición y errores | PPS 1 | PPS 1 §3.4–3.5; PPS 2 §3.4 (interfaz) | 06, 08 | QS-1, QS-2, QS-6 |
| E7 Ciclo de vida de anotaciones | CRUD, reglas, autoría, versión y conjuntos | PPS 2 | PPS 1 §3.6; PPS 2 §3.4–3.6 | 06, 07, 08 | QS-3 |
| E8 Importación | `CricImporter`, reporte y pantalla | PPS 2 · interfaz PPS 1 | PPS 1 §3.2; PPS 2 §3.7 | 09 | Casos `cricPointToBox` |
| E9 Exportación | Interno, COCO, YOLO si hay tiempo, y pantalla | PPS 2 · interfaz PPS 1 | PPS 1 §3.7; PPS 2 §3.8 | 10 | Casos de exportación, QS-9 |
| E10 Despliegue y documentación | Servidor o máquina virtual, manuales, informes y backlog | PPS 1 (servidor) · ambos | PPS 1 §3.8, §9; PPS 2 §3.9, §8 | 11 | QS-5, aceptación |
| E11 Calidad transversal | Privacidad, observabilidad y pruebas | Ambos | PPS 1 §9; PPS 2 §8 | 05, 12 | QS-8, QS-10 |

**Criterios de aceptación → épicas → incremento.** Así se ve, antes de empezar, en qué momento cada criterio de aceptación queda demostrable.

| Criterio de aceptación | Dónde lo exige | Épicas | Demostrable desde |
|---|---|---|---|
| Importar un subconjunto de CRIC o CCEDD | PPS 1 §8, PPS 2 §7 | E4, E8 | I3 |
| Registrar una WSI de prueba | PPS 1 §8, PPS 2 §7 | E4, E5 | I2 |
| Anotar una imagen convencional y una WSI | PPS 1 §8, PPS 2 §7 | E5, E6, E7 | I2 |
| Verificar clase, autor y coordenadas | PPS 1 §8, PPS 2 §7 | E7 | I2 |
| Exportar el resultado | PPS 1 §8, PPS 2 §7 | E9 | I3 |
| Levantar el sistema con la documentación | PPS 1 §8 (en el servidor), PPS 2 §7 (Compose) | E1, E10 | I4 (PPS 2) e I5 (PPS 1) |
