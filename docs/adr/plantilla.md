# Anexo B. Plantilla de ADR

Copiar como `docs/adr/NNNN-titulo-corto.md`, con el número siguiente al último. Extensión orientativa: una página. Si hace falta más, probablemente son dos decisiones.

```markdown
# ADR-NN. Título en forma de decisión («Usamos X para Y», no «Sobre X»)

**Estado:** `PROPUESTO` | `DECIDIDO` | `PENDIENTE` | reemplazado por ADR-MM
**Fecha:** dd/mm/aaaa · **Decisores:** nombres (y quién valida, si es la supervisión)

**Contexto.** Qué problema hay y qué fuerzas empujan: enunciado (PPS x §y), restricciones, datos
medidos. Sin la solución todavía.

**Decisión.** Qué hacemos, en presente y verificable. Lo suficientemente concreto para que otra
persona pueda implementarlo sin preguntar.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| … | … |

**Consecuencias.** Qué se vuelve más fácil, qué se vuelve más difícil y qué habrá que revisar.

**Verificación.** Qué prueba, escenario de calidad (QS-n) o revisión demuestra que la decisión
se cumple.
```

Reglas: un ADR por decisión; no se borra ni se reescribe; se reemplaza. Un ADR `PROPUESTO` que ajusta el alcance se presenta a la supervisión junto con el reemplazo de esfuerzo comparable (PPS 1 §10, PPS 2 §9).
