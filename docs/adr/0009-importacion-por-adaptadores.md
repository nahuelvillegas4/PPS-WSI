# ADR-09. Importación por adaptadores, empezando por CRIC

**Estado:** `PROPUESTO` · **Fecha:** 28/09/2026 · **Decisores:** Nahuel Villegas (dueño), Gino Tombesi; valida la supervisión (Guía §9 P5–P7)

**Contexto.** PPS 1 §3.2 y PPS 2 §3.7 piden importar un subconjunto documentado de anotaciones. CRIC trae puntos con clase Bethesda y CCEDD trae polígonos (Guía §2.6). La propuesta PPS 2 planifica CRIC.

**Decisión.**

- Interfaz `IAnnotationImporter` en tres pasos: planificar, reportar y ejecutar. En v0.1, `CricImporter`.
- Cada punto de CRIC se convierte en una caja de lado `boxSize` —100 px por defecto, a confirmar (P5)— centrada en el núcleo y recortada a la imagen; el punto original queda en `provenance`.
- Importación síncrona y atómica (una transacción), con `dryRun` por defecto y un reporte. Límite de 2.000 imágenes por importación. Los archivos se leen de una carpeta del volumen, nunca se suben por el navegador.
- Autor: un usuario sintético por fuente. Reimportar la misma fuente en el mismo dataset responde 409, para no duplicar.
- El formato exacto del archivo de CRIC se fija al descargarlo (`VERIFICAR`). CCEDD, en formato labelme, es el segundo adaptador si sobra tiempo o si la supervisión lo prefiere (P6).

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Tipo de geometría «punto» | Más fiel a CRIC, pero suma un tipo al editor, al contrato y a los exportadores; COCO de detección no tiene puntos (P5) |
| Importación asíncrona con cola | Innecesaria a esta escala: CRIC tiene 400 imágenes |
| Subir el archivo desde el navegador | Agrega multipart y límites de tamaño, cuando las imágenes ya están en el servidor |

**Consecuencias.** A favor: una fuente nueva es un adaptador nuevo, y el ground truth importado queda trazable hasta su registro de origen. En contra: una caja de tamaño fijo aproxima una célula de tamaño variable; el tamaño lo decide la supervisión.

**Verificación.** Casos `cricPointToBox` del contrato (incluido uno recortado); prueba del importador con un archivo de muestra; `dryRun` no escribe (la prueba cuenta filas antes y después).
