## 1. Introducción y objetivos

### 1.1 Para qué sirve este documento

Tiene tres usos. Primero, **fijar la arquitectura común** y las decisiones que tienen consecuencias para el grupo más allá de estas dos prácticas: quién mantiene qué, cómo sigue el sistema cuando termine la PPS, cómo se protegen imágenes que no deben salir del laboratorio. Segundo, **funcionar como contrato**: lo que figura como `DECIDIDO`, o como `PROPUESTO` una vez aprobado, se implementa así, y lo demás se conversa antes de escribir código. Tercero, **ser la base del backlog**: cada épica de §14 remite a secciones y ADR de este documento, de modo que una historia de usuario pueda citar su fundamento en lugar de repetirlo.

### 1.2 El problema, en una línea

La anotación fabrica el ground truth con el que el grupo entrena y evalúa modelos (Guía §1). La herramienta cubre organizar → visualizar → anotar → exportar; no entrena ni ejecuta modelos (PPS 1 §6, PPS 2 §5). Todo lo que sigue se ordena alrededor de una idea: **una anotación mal ubicada o mal atribuida es peor que una anotación faltante**, porque contamina en silencio el entrenamiento y la evaluación.

### 1.3 Alcance obligatorio y dónde lo exige cada enunciado

El flujo demostrable es uno solo; los dos enunciados lo reparten con superposiciones que resolvemos en ADR-08.

| Paso del flujo | PPS 1 | PPS 2 |
|---|---|---|
| Crear proyecto y dataset; definir clases | §3.1 | §3.1, §3.2 |
| Registrar imágenes JPG/PNG y WSI disponibles en el servidor | §3.2 | §3.1 |
| Importar anotaciones de prueba (CRIC o CCEDD) | §3.2 | §3.7 |
| Visualizar JPG/PNG y SVS en el navegador | §3.3 | — (consume el visor) |
| Crear, editar y eliminar rectángulos y polígonos | §3.4 | §3.4 |
| Coordenadas de nivel 0 independientes del zoom | §3.5 | §3.5 |
| Autor y fecha de cada anotación; conjuntos independientes por usuario | §3.4, §4 | §3.3, §3.6 |
| Persistir metadatos y anotaciones en una base de datos | §3.6 | §3.5 |
| Exportar a JSON interno documentado y a un formato externo | §3.7 | §3.8 |
| Levantar el sistema con Docker Compose y un procedimiento reproducible | §3.8 (en el servidor) | §3.9 |

Quedan fuera del alcance obligatorio el consenso entre revisores, las métricas de acuerdo, DICOM WSI, la ejecución de modelos, las preanotaciones, el active learning, los dashboards y el versionado de datasets (PPS 1 §6, PPS 2 §5). No los construimos, pero **dejamos el lugar donde se enchufan** (§5.4): es la forma concreta de cumplir el pedido de documentarlos como extensiones.

### 1.4 Objetivos de calidad, en orden de prioridad

El orden importa: cuando dos objetivos chocan, gana el de arriba.

| # | Objetivo | Por qué para este grupo | Se verifica en |
|---|---|---|---|
| 1 | **Corrección e integridad de las anotaciones**: geometría en nivel 0, autoría confiable, conjuntos por usuario intactos | Es el ground truth: un error acá se propaga a cada modelo que se entrene con el dataset (Guía §3.1) | QS-1, QS-2, QS-3 |
| 2 | **Instalación reproducible**: de `git clone` a sistema funcionando sin pasos manuales ocultos | Es criterio de aceptación de las dos PPS (PPS 1 §8, PPS 2 §7) y la condición para que la próxima cohorte arranque en horas, no en semanas | QS-5 |
| 3 | **Extensibilidad y mantenibilidad** | El producto es base de futuras prácticas (PPS 1 §1): agregar un formato o una herramienta no debe romper lo que ya funciona | QS-9, QS-10 |
| 4 | **Confidencialidad de las imágenes** | Son imágenes médicas: no se exponen sin sesión y no salen del laboratorio | QS-8 |
| 5 | **Fluidez de navegación** | Sin pan y zoom fluidos no se puede anotar una WSI | QS-4 |

Priorizamos **extensibilidad por sobre escalabilidad**: el sistema corre en un servidor del laboratorio con pocos usuarios simultáneos (a confirmar, Guía §9 P20). No agregamos colas, réplicas ni cachés distribuidas; sí agregamos puntos de extensión claros.

### 1.5 Partes interesadas

| Parte | Qué espera del sistema |
|---|---|
| Anotadores (especialistas del grupo) | Anotar rápido y con precisión, sin perder trabajo por un corte o una sesión vencida |
| Administración de datasets | Registrar imágenes, importar y exportar sin tocar código ni la base |
| Investigadores que entrenan modelos | Exportaciones correctas, reproducibles y trazables hasta su origen |
| Supervisión | Alcance cumplido y un límite claro entre lo evaluable de cada PPS |
| Futuras PPS | Entender, instalar y extender el sistema a partir de su documentación |

## 2. Restricciones

### 2.1 Técnicas, impuestas por los enunciados

- Una sola familia de WSI, SVS con OpenSlide; DICOM WSI queda fuera (PPS 1 §4, §6).
- OpenSlide del lado del servidor y OpenSeadragon en el navegador; OpenLayers no forma parte de la propuesta (PPS 1 §4, §5).
- El backend expone una fuente Deep Zoom (DZI) y **el navegador nunca descarga la WSI completa** (PPS 1 §4).
- Autenticación local y básica, con administrador inicial y autor de cada anotación; sin OIDC, recuperación de contraseña ni roles complejos (PPS 1 §4, PPS 2 §3.3).
- Docker Compose y procedimiento reproducible (PPS 1 §3.8, PPS 2 §3.9).
- Un repositorio y una planificación común, con responsabilidades individuales delimitadas; cada PPS se evalúa sobre su módulo (PPS 2 §1).
- El módulo de anotación debe poder probarse sobre JPG/PNG o con un adaptador del visor antes de que la WSI esté disponible, y la WSI se integra sin modificar el modelo de datos (PPS 2 §4).

### 2.2 Organizativas

- **Dos períodos distintos.** PPS 1: 5 h por día del 19/10 al 16/12/2026. PPS 2: 6 h por día del 19/10 al 03/12/2026. Consecuencia directa: la integración y la aceptación de la PPS 2 deben cerrar antes del fin de la PPS 2, y la API tiene que quedar documentada y cubierta por pruebas antes de esa fecha (R11).
- **Fechas indicativas.** Planificamos por incrementos con un orden fijo y semanas relativas (§13). Las fechas de las propuestas quedan como referencia; lo que no negociamos es el orden: primero el esqueleto integrado, después las funcionalidades.
- **Evaluación individual.** El repositorio y el proceso tienen que hacer evidente qué construyó cada uno: carpetas con dueño, revisiones cruzadas y trazabilidad de épicas (§12, §14).
- **Stack elegido en las propuestas**, como permite PPS 1 §4: React + TypeScript y FastAPI en la PPS 1; ASP.NET Core y PostgreSQL en la PPS 2. La consecuencia —dos lenguajes de backend para el grupo— se discute en ADR-01.

### 2.3 Del entorno

- El sistema debe funcionar **sin Internet** en el laboratorio: sin CDN, sin fuentes remotas, sin telemetría (ADR-12).
- El servidor todavía no está especificado (`PENDIENTE`, Guía §9 P18). Desarrollamos en local y, si el servidor no llega a tiempo, validamos en una máquina virtual equivalente (ADR-11).

### 2.4 Línea base de versiones

Verificada el 28/09/2026 contra npm, PyPI, las imágenes oficiales y la documentación de cada proyecto. Las versiones se fijan exactas en los archivos de bloqueo; se actualizan solo por PR con la CI en verde (ADR-14).

| Componente | Versión | Observación |
|---|---|---|
| .NET / ASP.NET Core | 10 (LTS) | En .NET 10 la especificación OpenAPI que genera ASP.NET Core es 3.1 por defecto |
| EF Core + proveedor Npgsql | 10.x | `VERIFICAR` versión exacta del proveedor al crear el proyecto |
| PostgreSQL | 18 | La 19 está en beta; no cambiamos de versión durante las PPS |
| Python | 3.13 | openslide-python, FastAPI, Pydantic y Uvicorn declaran soporte de 3.10 a 3.14 |
| FastAPI · Pydantic · Uvicorn | 0.141.1 · 2.13.5 · 0.54.0 | |
| openslide-python · openslide-bin | 1.4.6 · 4.0.1.2 | El wheel trae la librería nativa (OpenSlide 4.0.1); no hace falta instalarla en la imagen |
| Node.js (solo para compilar la SPA) | 24 LTS | Vite 8 exige Node ^20.19 o ≥ 22.12 |
| React · Vite | 19.3.0 · 8.3.1 | |
| TypeScript | 5.9.3 | Existen 6.0.3 y 7.0.2, pero typescript-eslint admite < 6.1 y openapi-typescript declara ^5 |
| OpenSeadragon | 6.1.1 | Incluye sus tipos TypeScript desde 6.0; no usar `@types/openseadragon` |
| openapi-typescript · openapi-fetch | 7.13.0 · 0.17.0 | Verificados contra el contrato v0.1 con `tsc --strict` |
| MSW (mocks en el navegador) | 2.15.x | La 3.0.0 se publicó el 28/09/2026: `VERIFICAR` antes de adoptarla |
| Nginx | 1.30.5 (estable) | `auth_request` viene compilado en la imagen oficial: `VERIFICAR` con `nginx -V` al fijar la etiqueta |
| Vitest · Playwright | 5.0.2 · 1.63.0 | Playwright solo si se automatiza el guion de UI (fuera del alcance de la PPS 1) |
