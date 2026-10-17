# Anexo C. Plantilla de historia de usuario

Copiar al crear el issue. Una historia entra a «Lista» cuando cumple la Definición de Listo (§12.5).

```markdown
### E<n>-H<m> · <verbo + resultado observable>

**Como** <rol> **quiero** <acción> **para** <beneficio>.

| Épica | Dueño | Fundamento | Impacto en el contrato | Datos de prueba | Estimación |
|---|---|---|---|---|---|
| E<n> | PPS 1 o PPS 2 | PPS x §y · ADR-nn | ninguno / compatible / incompatible | … | ≤ 2 días |

**Criterios de aceptación**
1. **Dado** … **cuando** … **entonces** …

**Notas técnicas:** …
**Listo:** [ ] criterios verificables [ ] fundamento citado [ ] impacto en el contrato declarado
[ ] datos disponibles [ ] ≤ 2 días
```

**Ejemplo completo.**

**E6-H3 · Dibujar un rectángulo sobre una WSI y guardarlo en nivel 0**

**Como** anotadora **quiero** dibujar un rectángulo sobre una WSI **para** marcar una región con su clase.

| Épica | Dueño | Fundamento | Impacto en el contrato | Datos de prueba | Estimación |
|---|---|---|---|---|---|
| E6 | PPS 1 | PPS 1 §3.4–3.5 · ADR-06 · ADR-08 | Ninguno (usa `createAnnotation` v0.1) | CMU-1.svs (`fetch-samples`) y casos C1 y C2 | 2 días |

**Criterios de aceptación**

1. **Dado** una WSI de 100.000 × 80.000 px abierta con la vista del caso C1, **cuando** arrastro en pantalla de (400, 300) a (500, 380), **entonces** la SPA envía `{"type": "rectangle", "x": 32000, "y": 21500, "width": 500, "height": 400}`.
2. **Dado** el rectángulo guardado, **cuando** paso a la vista del caso C2 (zoom ×2), **entonces** se dibuja en (300, 200) con 200 × 160 px de pantalla, y el JSON guardado no cambia.
3. **Dado** que la API responde 422 `geometry-out-of-bounds`, **cuando** guardo, **entonces** la figura queda marcada «sin guardar» junto al mensaje de la API.
4. **Dado** que la API no responde, **cuando** guardo, **entonces** la figura no aparece como guardada y puedo reintentar sin volver a dibujarla.

**Notas técnicas:** el editor desactiva pan y zoom mientras se dibuja (`setPanZoomEnabled(false)`) y convierte solo a través de `ImageViewer`. Los criterios 1 y 2 se automatizan con Vitest y los casos del contrato; 3 y 4 son pasos del guion manual.
