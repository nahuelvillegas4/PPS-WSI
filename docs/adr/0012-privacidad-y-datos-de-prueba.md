# ADR-12. Privacidad de las imágenes y datos de prueba

**Estado:** `DECIDIDO` · anonimización: `PENDIENTE` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** Son imágenes médicas. Un SVS puede traer imágenes asociadas (`label`, `macro`) con datos identificatorios. PPS 1 §9 y PPS 2 §8 piden datos de prueba no sensibles (Guía §9 P7–P9).

**Decisión.** Nunca se sirven las imágenes asociadas; las miniaturas salen de la pirámide. Los metadatos se exponen por lista blanca. Ninguna imagen ni dataset entra al repositorio: hay scripts de descarga con checksum y la fuente y la licencia quedan documentadas. Sin CDN ni telemetría. Los logs no contienen imágenes. Recomendamos nombres de archivo neutros. La anonimización ocurre fuera del sistema (`PENDIENTE`, P9).

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Versionar datasets de prueba en Git | Tamaño, licencias y riesgo de publicar datos |
| Git LFS | Mismos problemas de licencia, más costo |
| Reenviar todas las propiedades del SVS | Puede filtrar datos del escáner o del paciente |

**Consecuencias.** A favor: el repositorio puede compartirse sin riesgo. En contra: la instalación depende de descargar los datos, por eso lo hace un script.

**Verificación.** QS-8: una prueba automática recorre las rutas y confirma que ninguna entrega imágenes asociadas; la CI rechaza archivos grandes o binarios de imagen fuera de las rutas permitidas.
