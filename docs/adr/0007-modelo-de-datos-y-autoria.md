# ADR-07. Modelo de datos, autoría y conjuntos por usuario

**Estado:** `PROPUESTO` · **Fecha:** 28/09/2026 · **Decisores:** Nahuel Villegas (dueño), Gino Tombesi; valida la supervisión (Guía §9 P10–P14)

**Contexto.** PPS 2 §3.3, §3.5 y §3.6 y PPS 1 §3.4 piden clase, autor, fecha, geometría e imagen, con conjuntos independientes por usuario y sin sobrescribir a otros revisores.

**Decisión.** El detalle está en §8.2; lo esencial:

- Proyecto 1–N dataset 1–N imagen, clases por dataset. Una imagen pertenece a un solo dataset; el mismo archivo puede registrarse en otro como una imagen distinta.
- Una clase por anotación. `geometry` en JSONB, más caja envolvente y área calculadas. Autor y fechas los pone el servidor. `source` y `provenance` para la trazabilidad. Borrado lógico. Concurrencia optimista con `xmin` expuesta como `ETag`.
- La base garantiza que la clase pertenezca al dataset de la imagen, con claves foráneas compuestas. Clases usadas, datasets con imágenes y proyectos con datasets no se borran (409).
- **Conjunto por usuario = anotaciones de un autor.** Nadie modifica las de otro, tampoco un administrador (403). La interfaz muestra por defecto las propias; ver todas es una consulta de solo lectura.
- Las importaciones tienen como autor un usuario sintético por fuente (`import-cric`, sin ingreso): el ground truth importado es un conjunto más, comparable con los manuales.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Relación muchos-a-muchos entre imagen y dataset | Más flexible pero complica a quién pertenece cada anotación (P10) |
| Historial completo de revisiones | Auditoría total a costa de tablas y endpoints; queda como extensión (§5.4) |
| Borrado físico | Pierde la trazabilidad del ground truth |
| Autor de la importación = quien importa | Mezcla lo dibujado con lo importado |
| PostGIS | Consultas espaciales potentes que v0.1 no necesita |

**Consecuencias.** A favor: la base impide inconsistencias que el código podría dejar pasar, y los conjuntos quedan listos para futuras métricas de acuerdo. En contra: `dataset_id` aparece redundante en las anotaciones, y sin historial una edición reemplaza la geometría anterior (solo queda `updated_at`).

**Verificación.** QS-3. Pruebas con PostgreSQL real: una anotación con una clase de otro dataset viola la clave foránea; un `PATCH` ajeno responde 403; borrar una clase en uso responde 409.
