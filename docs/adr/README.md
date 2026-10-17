## 9. Decisiones de arquitectura

Registramos cada decisión importante como un ADR corto: contexto, decisión, alternativas descartadas, consecuencias y cómo la verificamos. Un ADR no se edita cuando la decisión cambia: se escribe uno nuevo que lo reemplaza. La plantilla está en el Anexo B.

| ADR | Decisión | Estado |
|---|---|---|
| [ADR-01](0001-spa-y-dos-servicios-tras-pasarela.md) | SPA y dos servicios detrás de una pasarela Nginx, en un único origen | `DECIDIDO` |
| [ADR-02](0002-teselas-dzi-al-vuelo.md) | Teselas DZI al vuelo y un solo camino para JPG/PNG y SVS | `DECIDIDO` |
| [ADR-03](0003-duenos-de-datos-y-resolucion.md) | Cada dato tiene un dueño; la pasarela resuelve imagen → archivo | `DECIDIDO` |
| [ADR-04](0004-sesion-y-proteccion-de-teselas.md) | Sesión por cookie de punta a punta; teselas protegidas con `auth_request` | `DECIDIDO` · usuarios `PROPUESTO` |
| [ADR-05](0005-convenciones-y-contrato.md) | Convenciones comunes y contrato como artefacto versionado | `DECIDIDO` |
| [ADR-06](0006-geometrias-y-coordenadas.md) | Geometrías en nivel 0: el servidor valida y nunca transforma | `DECIDIDO` · límites `PROPUESTO` |
| [ADR-07](0007-modelo-de-datos-y-autoria.md) | Modelo de datos, autoría y conjuntos por usuario | `PROPUESTO` |
| [ADR-08](0008-frontera-y-reparto-del-editor.md) | Frontera HTTP entre prácticas y reparto del editor | `PROPUESTO` |
| [ADR-09](0009-importacion-por-adaptadores.md) | Importación por adaptadores, empezando por CRIC | `PROPUESTO` |
| [ADR-10](0010-exportacion.md) | JSON interno como fuente de verdad; COCO obligatorio | `PROPUESTO` |
| [ADR-11](0011-un-compose-dos-entornos.md) | Un Compose, dos entornos | `DECIDIDO` |
| [ADR-12](0012-privacidad-y-datos-de-prueba.md) | Privacidad de las imágenes y datos de prueba | `DECIDIDO` |
| [ADR-13](0013-repositorio-unico.md) | Un único repositorio con una carpeta por módulo | `DECIDIDO` |
| [ADR-14](0014-linea-base-de-versiones.md) | Línea base de versiones y política de actualización | `DECIDIDO` |
