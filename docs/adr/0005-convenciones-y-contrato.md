# ADR-05. Convenciones comunes y contrato como artefacto versionado

**Estado:** `DECIDIDO` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** PPS 2 §4 pide documentar el contrato de integración en la primera semana. Dos módulos en tres lenguajes —TypeScript, Python y C#— tienen que coincidir en nombres, errores y coordenadas. Si el contrato es un texto, las diferencias aparecen recién al integrar.

**Decisión.**

- Convenciones comunes (§8.5): camelCase, errores RFC 9457 con URN, criterio 400/422, rutas versionadas, fechas UTC y cuerpos estrictos.
- El contrato vive en `contract/`: OpenAPI 3.1 de la API y del servicio de teselas, JSON Schema 2020-12 de la geometría y del JSON interno, y casos numéricos. Versión 0.1.0.
- **Primero escrito, después generado.** La v0.1 se escribe a mano y de ella salen tipos TypeScript y mocks desde el primer día. Cuando hay implementación, la especificación se genera —ASP.NET Core en el build, FastAPI al exportar la suya— y la CI falla si difiere del contrato.
- Cambiar el contrato es un PR que toca `contract/`, aprobado por ambos. Versionado semántico; `/v1` en la ruta solo cambia con cambios incompatibles.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Documento en prosa | No se verifica: la divergencia es cuestión de tiempo |
| Generar desde el código desde el inicio | La SPA no podría avanzar hasta que exista la API; contradice el trabajo en paralelo de PPS 2 §4 |
| GraphQL o gRPC | Sobredimensionado; las teselas necesitan HTTP simple |

**Consecuencias.** A favor: el compilador de TypeScript detecta los cambios de la API; los tres lenguajes corren los mismos casos. En contra: hay que mantener la comparación en la CI y tolerar diferencias cosméticas de la OpenAPI generada (`VERIFICAR` una comparación semántica en lugar de textual).

**Verificación.** `scripts/check_contract.py` pasa y los tipos generados compilan con `tsc --strict` (ambos verificados el 28/09/2026). En la CI, un job de deriva por servicio.
