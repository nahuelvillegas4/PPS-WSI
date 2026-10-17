# ADR-13. Un único repositorio con una carpeta por módulo

**Estado:** `DECIDIDO` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** PPS 2 §1: «un repositorio y una planificación común, con responsabilidades individuales claramente delimitadas». PPS 1 §9 y PPS 2 §8 piden un repositorio institucional. Queremos clonar un solo repositorio y trabajar sobre él.

**Decisión.** Un repositorio con `api/`, `tiles/`, `web/`, `contract/`, `deploy/`, `docs/`, `scripts/` y `data/` (ignorada por Git), más `compose.yaml` y `.env.example` en la raíz. `CODEOWNERS` por carpeta; la CI filtra por ruta. Un cambio que cruza módulos —por ejemplo contrato, API y SPA— es un único PR atómico. Plataforma: GitHub, según ambas propuestas; la organización institucional queda `PENDIENTE` (P21).

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Un repositorio por módulo, con el contrato como paquete | Versiones cruzadas, PR coordinados e instalación en varios pasos |
| Submódulos de Git | Fricción conocida y fácil de romper |

**Consecuencias.** A favor: `git clone` y `docker compose up`; cambios de contrato atómicos; trazabilidad por carpeta para la evaluación individual. En contra: la CI debe filtrar rutas para no correr todo siempre, y como ambos pueden escribir en todo, la rama principal exige la aprobación del dueño de cada carpeta.

**Verificación.** QS-5; la protección de la rama principal exige la aprobación del `CODEOWNER`.
