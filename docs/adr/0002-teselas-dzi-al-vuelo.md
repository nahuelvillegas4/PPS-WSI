# ADR-02. Servicio de teselas: DZI al vuelo y un solo camino para JPG/PNG y SVS

**Estado:** `DECIDIDO` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** PPS 1 §4 exige una fuente Deep Zoom y que el navegador nunca descargue la WSI completa; PPS 1 §3.3 pide además mostrar JPG y PNG (Guía §4.2).

**Decisión.** El servicio genera el DZI al vuelo con `DeepZoomGenerator(tile_size=254, overlap=1, limit_bounds=False)` y teselas JPEG. Todo archivo se abre con `openslide.open_slide()`, que devuelve `OpenSlide` para SVS e `ImageSlide` para JPG/PNG: un solo camino de código y un solo tipo de fuente para el visor. Los slides abiertos quedan en una caché LRU; las respuestas llevan `Cache-Control: private, max-age=86400`.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Pregenerar la pirámide en disco | Mejor latencia, pero duplica almacenamiento y agrega un procesamiento al registrar; la propuesta PPS 1 lo deja fuera de alcance |
| JPG/PNG como imagen simple en OpenSeadragon | Dos caminos en el visor y en las pruebas; una imagen grande se descarga entera |
| `limit_bounds=True` | Recorta a la región escaneada: las coordenadas del DZI dejan de ser las de nivel 0 y aparece una conversión extra |

**Consecuencias.** A favor: el mismo código y las mismas coordenadas para los dos tipos de imagen; el visor no sabe de formatos; DICOM WSI entraría por el mismo adaptador. En contra: la primera tesela en frío cuesta CPU y latencia. Lo mitigan la caché de slides y la caché HTTP; si QS-4 no se cumple, pregenerar niveles es la extensión natural. Con `limit_bounds=False` se ve el área no escaneada del portaobjetos, algo aceptable.

**Verificación.** Casos D1 y D2 del contrato, calculados con `DeepZoomGenerator` real; QS-4 medido en el incremento I2.
