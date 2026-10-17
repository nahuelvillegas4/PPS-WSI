# ADR-10. Exportación: el JSON interno es la fuente de verdad y COCO es obligatorio

**Estado:** `PROPUESTO` · **Fecha:** 28/09/2026 · **Decisores:** Nahuel Villegas (dueño), Gino Tombesi; valida la supervisión (Guía §9 P15–P17)

**Contexto.** PPS 1 §3.7 y PPS 2 §3.8 piden un JSON interno documentado y un formato externo acordado (Guía §3.3–3.5). La propuesta PPS 2 planifica COCO y YOLO.

**Decisión.**

- El JSON interno (`gia-annotations` 1.x, `contract/schemas/internal-export.schema.json`) se genera desde el modelo, y COCO y YOLO se derivan del mismo contenido: una consulta, un serializador por formato.
- **COCO obligatorio:** `category_id` = id de la clase; `bbox` desde la esquina; `segmentation` para polígonos y rectángulos; área calculada. Las WSI se exportan como imagen completa en nivel 0, sin recortes (P16).
- **YOLO condicional:** solo si el flujo obligatorio ya está probado (PPS 2 §9); solo imágenes convencionales; índice de clase por `displayOrder` y luego id; 6 decimales.
- Filtro por autor (`me`, `all` o una lista de ids). Las exportaciones no copian las imágenes: las referencian por su clave de almacenamiento. Sin efectos secundarios: es un `GET` descargable.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| COCO como formato interno | Pierde autoría, fechas y procedencia, y ata el sistema a un consumidor |
| COCO y YOLO obligatorios | Duplica pruebas sin un pedido explícito del grupo (PPS 2 §9) |
| Recortes (patches) para WSI | Recortar polígonos agrega complejidad y depende del pipeline que se use (P16) |

**Consecuencias.** A favor: agregar un formato no toca los demás (QS-9). En contra: quien consume la exportación necesita acceso a la carpeta de imágenes del servidor.

**Verificación.** Casos de `export.json` (COCO, YOLO y WSI) ejecutados desde xUnit; el JSON interno se valida contra su esquema en la CI.
