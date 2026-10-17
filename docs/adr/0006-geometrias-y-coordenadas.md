# ADR-06. Geometrías en nivel 0: el servidor valida y nunca transforma

**Estado:** `DECIDIDO` (sistema de coordenadas y validación) · `PROPUESTO` (límites numéricos) · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** PPS 1 §3.5 y PPS 2 §3.5 exigen nivel 0 independiente del zoom (Guía §2.4, §5.4). La propuesta PPS 2 planificaba «normalización» y «corrección» de coordenadas en la API.

**Decisión.**

- Dos tipos: `rectangle {x, y, width, height}`, alineado a los ejes, con (x, y) en la esquina superior izquierda; y `polygon {points}`, de 3 a 10.000 vértices y cierre implícito.
- Píxeles de nivel 0 con decimales; origen en la esquina superior izquierda de la imagen; la imagen ocupa [0, W] × [0, H].
- El servidor valida la forma (400) y las reglas (422) en un orden fijo: límites de la imagen → cierre explícito o vértices repetidos → autointersección → área nula. **No transforma, no redondea y no recorta.**
- Las conversiones pantalla ↔ nivel 0 ocurren solo en el adaptador de `ImageViewer`; el DZI se genera con `limit_bounds=False`.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Coordenadas normalizadas a [0, 1] | Dependen de W y H, invitan a la trampa de multiplicar y por el alto y COCO usa valores absolutos |
| Coordenadas del nivel mostrado más el zoom | Se pierden al cambiar paneo, ventana o nivel (Guía §2, pregunta 2) |
| GeoJSON como formato de trabajo | Eje y hacia arriba y anillos cerrados; sirve para interoperar (P17), no para trabajar |
| Que la API «corrija» (recortar, redondear) | Esconde errores del visor que después aparecen en el dataset exportado |
| Aceptar polígonos que se cruzan | Máscaras ambiguas al rasterizar |

**Consecuencias.** A favor: una única verdad numérica, y exportar a COCO es copiar. En contra: el editor debe impedir o avisar las geometrías inválidas antes de enviarlas, y los importadores deben descartar o reportar las de origen que no cumplan.

**Verificación.** QS-1 y QS-2. `coordinates.json` y `geometry-validation.json` se ejecutan en la CI de los tres módulos; el orden de las reglas importa: un polígono en forma de moño simétrico tiene área con signo cero.
