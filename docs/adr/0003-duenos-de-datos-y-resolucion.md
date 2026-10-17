# ADR-03. Cada dato tiene un dueño; la pasarela resuelve imagen → archivo

**Estado:** `DECIDIDO` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** La API necesita saber qué imágenes existen y sus dimensiones; el servicio de teselas necesita saber qué archivo abrir. Si los dos leen la base o los dos abren archivos, cualquier cambio de uno rompe al otro.

**Decisión.**

- La API es dueña de proyectos, datasets, clases, imágenes —incluidos su clave de almacenamiento y sus metadatos técnicos— y anotaciones.
- El servicio de teselas es el único que abre imágenes. Al registrar, la API le pide los metadatos una sola vez (`GET /internal/v1/inspect`) y los guarda.
- Para servir teselas, Nginx consulta a la API por `auth_request`; la API responde `204` con `X-Storage-Key` y Nginx reenvía esa clave al servicio de teselas, que no consulta ni la API ni la base: valida la clave y abre el archivo.
- La clave de almacenamiento es una ruta relativa a `/data/images`, con `/` como separador y sin `..`.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| El servicio de teselas lee la base de la API | Queda atado al esquema de otro módulo: una migración lo rompe |
| El servicio de teselas llama a la API en cada tesela | El mismo costo que `auth_request`, pero con código propio y una dependencia más |
| La URL de la tesela lleva la ruta del archivo | Expone carpetas y nombres, que pueden contener datos, y permitiría pedir archivos no registrados |
| Registro de imágenes propio en el servicio de teselas | Dos fuentes de verdad |

**Consecuencias.** A favor: el servicio de teselas es sin estado y se prueba solo con archivos; la API no depende de OpenSlide. En contra: la resolución depende de configurar bien Nginx (R4) y cada tesela suma una subpetición, que puede cachearse en Nginx si QS-4 lo exige.

**Verificación.** Prueba de humo: tesela sin sesión → 401, con sesión → 200. Una clave con `..` → 422 en el servicio de teselas, que no tiene credenciales de la base.
