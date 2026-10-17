# ADR-14. Línea base de versiones y política de actualización

**Estado:** `DECIDIDO` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** Al 28/09/2026 conviven versiones recién publicadas que conviene no adoptar a ciegas: MSW 3.0 (publicada ese mismo día), TypeScript 7 (incompatible con typescript-eslint y openapi-typescript), PostgreSQL 19 en beta y OpenSeadragon 6 con un pipeline de carga nuevo.

**Decisión.** Versiones exactas en los archivos de bloqueo e imágenes de contenedor con etiqueta exacta. La tabla de §2.4 es la línea base. Se actualiza solo por PR con la CI en verde y una nota en el CHANGELOG; las versiones mayores, solo al inicio de un incremento; los parches de seguridad, en cualquier momento. Para Python se usa un archivo de bloqueo (`VERIFICAR` la herramienta: pip-tools o uv).

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Usar siempre la última versión | Rompe herramientas en medio de un incremento |
| No actualizar nunca | Deja deuda de seguridad a la próxima cohorte |

**Consecuencias.** A favor: builds reproducibles. En contra: quedar detrás en versiones mayores (TypeScript 5.9), algo que dejamos documentado para la próxima cohorte.

**Verificación.** La CI instala desde los archivos de bloqueo (`npm ci`, restauración de NuGet con bloqueo y el equivalente en Python).
