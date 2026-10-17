# ADR-08. Frontera HTTP entre prácticas y reparto del editor

**Estado:** `PROPUESTO` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas; decide la supervisión (PPS 1 §10, PPS 2 §9)

**Contexto.** El editor aparece en los dos enunciados: PPS 1 §3.4 y §7 («Herramientas de anotación y persistencia», 35 h); PPS 2 §3.4, §6 («Editor y CRUD de anotaciones», 45 h) y §8 («API y editor de anotaciones»). PPS 2 §4 describe a la PPS 2 consumiendo el contrato del visor «para dibujar y persistir geometrías». En las propuestas, la PPS 2 se atribuye la interfaz de edición pero solo planifica endpoints, y la PPS 1 planifica todo el frontend, incluidas las herramientas.

**Decisión propuesta: opción A, reparto por capas.**

- La frontera entre prácticas es HTTP: la API, el servicio de teselas y la sesión.
- **PPS 1:** la interacción del editor en el navegador (herramientas, capa SVG, edición visual, conversión a nivel 0 y presentación de los errores de la API).
- **PPS 2:** el ciclo de vida de la anotación en el servidor (reglas de validez, persistencia, autoría, versión y concurrencia, borrado lógico y conjuntos por usuario), que es el núcleo de su objetivo (PPS 2 §2).
- `ImageViewer` se documenta igual como parte del contrato (§5.2), con lo que se cumple la letra de PPS 2 §4, y lo consume el editor.

**Opción B, alternativa.** La PPS 2 construye el editor en React sobre `ImageViewer`, y la PPS 1 aporta visor, teselas y pantallas.

| Criterio | Opción A (por capas) | Opción B (editor en la PPS 2) |
|---|---|---|
| Fidelidad a PPS 2 §4 | Se aparta de la letra: requiere acuerdo | Literal |
| Coherencia con las propuestas | Coincide con lo planificado por cada uno | Suma trabajo de frontend que la propuesta PPS 2 no incluye |
| Riesgo en el camino crítico | Un solo dueño para la SPA | Dos personas en el mismo código de la SPA, en la parte más crítica |
| Evaluación individual | Frontera nítida: HTTP | Frontera dentro del frontend, más difícil de delimitar |
| Costo de cambiar después | Bajo mientras `ImageViewer` esté estable | — |

**Consecuencias.** A favor: cada módulo se prueba solo contra su contrato y el reparto coincide con lo que planificó cada uno. En contra: se aparta de la letra de PPS 2 §4, y las horas de «editor» de la PPS 2 se cubren con reglas de geometría, pruebas, importación y exportación.

**Verificación.** Cada historia de E6 y E7 tiene un único dueño (§14); `CODEOWNERS` asigna `web/src/features/annotations` a la PPS 1 y el dominio de anotaciones de `api/` a la PPS 2.
