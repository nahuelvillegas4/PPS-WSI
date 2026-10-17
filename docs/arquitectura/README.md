# Herramienta de anotación de imágenes médicas — Arquitectura y línea base técnica

**Proyecto global PPS 1 + PPS 2 · GIA · UTN FRC**
Versión 0.9 (borrador para revisión de la supervisión) · 28/09/2026

<!-- pdf:skip-start -->
Este documento es el contrato técnico del proyecto: fija qué decidimos, qué proponemos y qué queda abierto, y es la base de las historias de usuario. Se versiona en este repositorio; el PDF que se envía a la supervisión se genera desde estos archivos.

| # | Sección | Archivo |
|---|---|---|
| — | Resumen para la supervisión y control del documento (§0) | este archivo |
| 1–2 | Introducción, objetivos de calidad y restricciones | [01-introduccion-y-restricciones.md](01-introduccion-y-restricciones.md) |
| 3–4 | Contexto (C4-1) y estrategia de solución | [02-contexto-y-estrategia.md](02-contexto-y-estrategia.md) |
| 5–6 | Vista de bloques (C4-2 y C4-3) y vista de ejecución | [03-bloques-y-ejecucion.md](03-bloques-y-ejecucion.md) |
| 7–8 | Despliegue y conceptos transversales | [04-despliegue-y-conceptos.md](04-despliegue-y-conceptos.md) |
| 9 | Decisiones de arquitectura (ADR) | [../adr/README.md](../adr/README.md) |
| 10–11 | Escenarios de calidad, riesgos y deuda técnica | [05-calidad-y-riesgos.md](05-calidad-y-riesgos.md) |
| 12–14 | Organización, roadmap por incrementos y trazabilidad | [06-organizacion-y-roadmap.md](06-organizacion-y-roadmap.md) |
| 15 | Pendientes para la supervisión | [07-pendientes.md](07-pendientes.md) |
| A | Contrato de integración v0.1 (normativo) | [../../contract/README.md](../../contract/README.md) |
| B | Plantilla de ADR | [../adr/plantilla.md](../adr/plantilla.md) |
| C | Plantilla de historia de usuario | [../plantillas/historia-de-usuario.md](../plantillas/historia-de-usuario.md) |
| D | Referencias con versión y fecha | [anexo-d-referencias.md](anexo-d-referencias.md) |
<!-- pdf:skip-end -->

## Resumen para la supervisión

**Qué construimos.** Una herramienta web propia para organizar, visualizar y anotar imágenes convencionales (JPG/PNG) y WSI (SVS). Las anotaciones —rectángulos y polígonos con clase, autor y fecha— se guardan en coordenadas de nivel 0 y se exportan a un JSON interno documentado y a COCO. Es un único producto con dos módulos evaluables por separado (PPS 2 §1): la PPS 1 construye el servicio de teselas, el visor, el editor en el navegador y todo el frontend; la PPS 2 construye la API de gestión, la persistencia, la autenticación, la importación y la exportación.

**Cómo, en cinco decisiones.**

- Una aplicación de una sola página (SPA) en React + TypeScript y dos servicios detrás de una pasarela Nginx, todo bajo un único origen: la API en ASP.NET Core con PostgreSQL y el servicio de teselas en FastAPI con OpenSlide (ADR-01, ADR-02).
- Cada dato tiene un solo dueño. La API es dueña de proyectos, imágenes y anotaciones; el servicio de teselas es el único que abre archivos de imagen. Nginx autoriza cada pedido de teselas preguntándole a la API (`auth_request`), de modo que el servicio de teselas no necesita conocer usuarios ni base de datos (ADR-03, ADR-04).
- Toda geometría vive en píxeles de nivel 0. El servidor valida y rechaza; nunca transforma coordenadas (ADR-06).
- El contrato de integración es un artefacto versionado que la integración continua verifica: OpenAPI 3.1, JSON Schema y casos numéricos calculados con la librería real (ADR-05, Anexo A).
- Un repositorio, un `docker compose up` y dos entornos —local y servidor— que difieren solo en configuración (ADR-11, ADR-13).

**Qué cambia respecto de las propuestas iniciales.**

| Tema | Propuestas iniciales | Este documento |
|---|---|---|
| Integración | Ambas integran al final del período | Esqueleto de punta a punta en las semanas 2–3; Compose integrado desde la semana 1 (§13) |
| Contenedores | La PPS 1 dockerizaba después del cierre de la PPS 2 | Cada módulo se contenedoriza desde el inicio; la aceptación de la PPS 2 usa el sistema completo |
| Editor de anotaciones | Ambas propuestas se lo atribuyen | Interfaz en la PPS 1; reglas, persistencia y autoría en la PPS 2 (`PROPUESTO`, ADR-08) |
| Usuarios | «Registro de usuarios» | Sin autorregistro: altas por un administrador (`PROPUESTO`, ADR-04) |
| Coordenadas | «Normalización» y «corrección» en la API | La API valida y rechaza, nunca transforma (`DECIDIDO`, ADR-06) |
| Formato externo | COCO y YOLO | COCO obligatorio; YOLO solo si sobra tiempo (`PROPUESTO`, ADR-10) |
| Repositorio | GitHub, sin estructura definida | Un único repositorio con una carpeta por módulo, como pide PPS 2 §1 (`DECIDIDO`, ADR-13) |

**Lo que necesitamos de la supervisión** (el detalle está en §15):

1. Aprobar el reparto del editor de anotaciones (ADR-08) o elegir la alternativa.
2. Fecha y datos del servidor del laboratorio (Guía §9 P18). Si no está disponible a tiempo, aceptar la validación en una máquina virtual equivalente (PPS 1 §10).
3. Formato externo y framework de entrenamiento del grupo (P15); tamaño de la caja que reemplaza a los puntos de CRIC (P5).
4. Subconjunto de CRIC o CCEDD y WSI de prueba, con sus condiciones de uso (P7, P8).
5. Permisos entre revisores y alcance de «autor y fecha» (P12, P13).

## 0. Control del documento

| Campo | Valor |
|---|---|
| Documento | Arquitectura y línea base técnica del proyecto global PPS 1 + PPS 2 |
| Versión | 0.9 — borrador para revisión de la supervisión |
| Fecha | 28/09/2026 |
| Autores | Gino Paolo Tombesi (PPS 1, legajo 95345) · Ángel Nahuel Villegas (PPS 2, legajo 94837) |
| Destinatarios | Alejandro García (supervisor profesional) · Martín Nicolás Gramática (supervisor docente) |
| Fuente versionada | `docs/arquitectura/` y `docs/adr/` del repositorio del proyecto |
| Contrato de integración | carpeta `contract/`, versión 0.1.0 (Anexo A) |

### 0.1 Estados de las decisiones

Cada decisión lleva uno de cuatro estados. El estado dice quién puede cambiarla.

| Estado | Significado | Quién lo cambia |
|---|---|---|
| `DECIDIDO` | Lo acordamos entre los dos y no altera alcance, reparto ni criterios de evaluación. | Ambos estudiantes, con un ADR nuevo |
| `PROPUESTO` | Nuestra recomendación. Ajusta alcance, reparto o criterios, o interpreta un enunciado: necesita validación (§15). | La supervisión |
| `PENDIENTE` | Falta un dato externo (servidor, datos, criterio del grupo). Tiene un disparador de cierre. | Quien tenga el dato |
| `VERIFICAR` | Dato técnico que confirmamos al implementar: versión exacta, comportamiento de una librería. | El dueño del módulo |

### 0.2 Cómo citamos

- **PPS 1 §3.4** es el enunciado de la PPS 1, sección 3, ítem 4. Los enunciados mandan sobre las propuestas y las propuestas sobre la guía.
- **Propuesta PPS 1** y **propuesta PPS 2** son las propuestas iniciales de cada estudiante.
- **Guía §5.4** es la sección 5.4 de «Del vidrio al dataset». No repetimos la guía, la referenciamos; el glosario está en la Guía §7 y las preguntas abiertas en la Guía §9 (P1 a P24).
- **ADR-06** es la decisión de arquitectura 6 (§9). **QS-4** es el escenario de calidad 4 (§10). **R3** es el riesgo 3 (§11).

### 0.3 Cómo se modifica este documento

1. Una decisión `DECIDIDO`, o una `PROPUESTO` ya aprobada, no se reescribe: se registra un ADR nuevo que la reemplaza y el anterior queda como «reemplazado por ADR-NN». La historia de las decisiones es parte del valor del documento para las próximas cohortes.
2. El contrato (Anexo A) cambia solo por pull request aprobado por los dos. Un cambio compatible sube la versión menor; uno incompatible sube la mayor y actualiza los casos numéricos en el mismo PR (ADR-05).
3. Un cambio del alcance obligatorio sigue PPS 1 §10 y PPS 2 §9: se propone por escrito, se identifica qué se retira a cambio y lo retirado pasa al backlog.
4. Cada versión suma una fila al historial.

### 0.4 Historial

| Versión | Fecha | Cambio |
|---|---|---|
| 0.9 | 28/09/2026 | Primera versión completa: arquitectura, 14 ADR, contrato v0.1.0 verificado, roadmap por incrementos y pendientes para la supervisión. |
