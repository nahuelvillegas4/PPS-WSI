# ADR-17. La subida desde el navegador conserva la URL de la API, envía un archivo por petición y confirma sin sobrescribir

**Estado:** `PROPUESTO` · **Fecha:** 31/10/2026 · **Decisores:** Gino Tombesi (dueño), Nahuel Villegas; valida la supervisión junto con [ADR-15](0015-roles-por-proyecto-y-membresia.md)

**Contexto.** Se pidió poder registrar imágenes en un dataset subiéndolas desde la computadora de quien trabaja; forma parte del cambio de alcance descrito en [ADR-15](0015-roles-por-proyecto-y-membresia.md). El endpoint `POST /api/v1/datasets/{datasetId}/images/upload` ya existe (multipart, hasta 2.000 archivos por petición, atómico por petición, clave `datasets/{datasetId}/{nombre saneado}`), pero no está listo para un navegador:

- Cualquier usuario autenticado puede llamarlo. `[DisableRequestSizeLimit]` quita el límite de la petición (solo queda el de formulario, 10 GiB) y nada comprueba el espacio libre.
- `SaveFileAsync` abre con `FileMode.Create`, así que sobrescribe, y la reversión borra por clave: dos subidas concurrentes con el mismo nombre pueden pisarse o borrarse el archivo.
- La pasarela corta a los 300 s (`proxy_read_timeout` y `proxy_send_timeout` de `/api/`) y una subida de 6 a 10 GB necesita más después del último byte (copia del temporal al destino, inspección y confirmación). Es una estimación de diseño que se mide en la verificación.
- Los documentos dicen que el volumen de imágenes se monta de solo lectura y que nada se sube desde el navegador, pero `compose.yaml` ya lo monta en escritura en `api`.
- La SPA no tiene cliente de subida: hoy solo registra archivos que ya están en el servidor, por `storageKey`.

**Decisión.** El contrato conserva su forma; cambian la protección, la confirmación y la operación.

*1. Cliente.*

- Una petición por archivo. Cada petición es atómica y la SPA ordena una cola con progreso, cancelación y reintento por archivo; un fallo no descarta el resto. El tope de 2.000 archivos por petición sigue para otros clientes.
- `XMLHttpRequest`, porque `fetch` no informa el progreso de la subida. Sin dependencias nuevas; el código vive en `web/src/features/upload/`.
- Filtro en la SPA: extensiones `svs`, `png`, `jpg` y `jpeg`, sin archivos vacíos, sin nombres repetidos (sin distinguir mayúsculas) y con tope `MAX_UPLOAD_BYTES` = 10 GiB − 1 MiB, atado a la constante del servidor. Un `.svs` sube solo; los PNG y JPG chicos, hasta 3 a la vez.
- La cola vive a nivel de aplicación: cerrar el diálogo no cancela; hay un indicador en la cabecera y un aviso al cerrar la pestaña mientras hay trabajo activo. Los `File` están solo en memoria: recargar la página pierde la cola.
- El diálogo se muestra al administrador de proyecto (`image.upload`) y al administrador global. Registrar por `storageKey` se muestra solo al administrador global.

| Respuesta o falla | Qué hace la cola |
|---|---|
| Error de red o 503 | Dos reintentos automáticos con espera creciente; después, reintento manual |
| 502 o 504 | Solo reintento manual: el servidor pudo haber confirmado |
| 409 `already-registered` o `storage-key-in-use` | Estado «conflicto» (no «omitido»); ofrece renombrar y reintentar |
| 400, 413, 422 o 507 | Falla con el `detail` del servidor; sin reintento |
| 401 | Pausa la cola con un aviso; los `File` sobreviven y «Reanudar» vuelve a consultar `/auth/me` |
| 403 o 404 | Falla con «ya no hay acceso» |
| Conexión cortada con bytes enviados, en un archivo de más de unos 64 MB | No reintenta sola; consulta `GET /projects/{projectId}`: 401 pausa, 404 indica acceso perdido, un `myRole` sin permiso de subida indica permiso perdido y cualquier otra cosa es un error de red |

La consulta de la última fila existe porque un 401 o 403 temprano durante una subida en curso puede llegar al navegador como un error de red sin código.

*2. Confirmación segura del archivo.*

- `IStorageService.SaveFileAsync` pasa a crear-nuevo: escribe `.{nombre}.part-{guid}` en el directorio destino, hace `Flush(flushToDisk: true)` y mueve con `File.Move(overwrite: false)`. Si el destino existe, lanza `StorageKeyConflictException` (Dominio).
- La acción registra las claves propias (`ownedKeys`) solo tras mover con éxito. La reversión borra únicamente esas claves y el `.part` se borra en `finally`: una subida concurrente que pierde nunca toca el archivo de la que gana.
- 409 con dos identificadores: `already-registered` (ya hay fila en la base) y `storage-key-in-use` (hay un archivo en esa clave sin fila: huérfano o carrera perdida). Una violación de unicidad (23505) también da 409. `GiaExceptionHandler` mapea `InvalidDataException` a 400 y no registra errores por cancelación del cliente. El 413 del manejador queda como defensa en profundidad: el autoritativo es el del preflight (`VERIFICAR` con una prueba sobre la tubería real, porque ASP.NET Core puede envolver estas fallas de lectura en un 400 de estado del modelo).
- Un barrido al arrancar borra los `.*.part-*` y los temporales de más de 1 día, con registro en el log.

*3. Límites y preflight.*

- `[RequestSizeLimit(UploadLimits.MaxRequestBytes)]` (10 GiB) reemplaza a `[DisableRequestSizeLimit]`, con el mismo tope en Nginx; `ValueCountLimit` = 2100.
- `[UploadPreflight]` es un filtro de autorización con `Order = 0`: corre después de la guarda de [ADR-16](0016-autorizacion-por-proyecto-y-sesion.md) y antes del *binding*. Sin `Content-Length`: 400. Más que el tope: 413 `payload-too-large`. Menos espacio libre en el volumen de imágenes que `Content-Length` + 1 GiB: 507 `insufficient-storage`. Quien no tiene permiso nunca consigue que el servidor lea el cuerpo.
- Justo antes de `BeginTransactionAsync` se vuelve a llamar a `IAccessGate.EnsureAsync`. Si falla, se borran las `ownedKeys` y se relanza: una persona revocada durante una subida larga no confirma.
- La acción inspecciona con `allowFallback: false` (parámetro opcional del puerto `IImageInspector`): `TILES_FALLBACK_ENABLED` nunca persiste dimensiones inventadas desde una subida.
- En contenedor (`DOTNET_RUNNING_IN_CONTAINER=true`, no según `Environment`, porque Compose usa `Development` por defecto) la API exige que `/data/images` exista (el Dockerfile no lo crea, así se detecta un montaje ausente) y que pase una prueba de crear y borrar; si no, no arranca.

*4. Operación.*

- `deploy/gateway/nginx.conf`: un `location ~ ^/api/v1/datasets/[0-9]+/images/upload$` que replica el bloque de `/api/` (`proxy_pass`, cabeceras, `proxy_request_buffering off`, `client_max_body_size 10G`) con `proxy_http_version 1.1` y `client_body_timeout`, `proxy_read_timeout` y `proxy_send_timeout` de 1800 s. El resto de `/api/` conserva 300 s. No se toca el `auth_request` de `/tiles/`.
- Un volumen con nombre `uptmp` montado en `/var/tmp/pps-upload`, con `ASPNETCORE_TEMP` apuntando ahí: los temporales de formulario (los archivos de más de 64 KB) no cargan el montaje lento de las imágenes ni su volumen. Se verifica con un archivo de más de 64 KB. La doble copia en disco (temporal y `.part`) se acepta.
- El volumen de imágenes se monta en lectura y escritura en `api` y solo lectura en `tiles`.

*5. Privacidad ([ADR-12](0012-privacidad-y-datos-de-prueba.md)).* El archivo se guarda tal cual: no se modifican las imágenes asociadas `label` y `macro` de un SVS. Siguen en el disco y nunca se sirven (QS-8); la anonimización sigue fuera del sistema (`PENDIENTE`, P9). El nombre del archivo, saneado por `StorageKeyValidator`, forma parte de la clave de almacenamiento y de `name`, y puede contener datos identificatorios: la recomendación de nombres neutros de ADR-12 sigue vigente y el conflicto 409 ofrece renombrar. Separar el nombre original de la clave queda como seguimiento.

*6. Qué precisa o reemplaza.* [ADR-03](0003-duenos-de-datos-y-resolucion.md) no se contradice: la API escribe los bytes pero no los interpreta, solo `tiles` abre imágenes y la inspección sigue pidiéndose una vez al registrar; se precisa que el archivo también puede llegar desde el navegador. [ADR-09](0009-importacion-por-adaptadores.md) sigue valiendo: «nunca se suben por el navegador» se refiere a los archivos de anotaciones. Se reemplazan las afirmaciones de §3.1, §5.1 y §7.1 de que el volumen de imágenes es de solo lectura para `api` y de que las imágenes nunca se suben desde el navegador (ver la lista final).

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Un solo pedido con todo el lote desde la SPA | Un corte o un fallo invalida el lote; no hay progreso, cancelación ni reintento por archivo |
| `fetch` en lugar de `XMLHttpRequest` | No informa el progreso de la subida |
| Bajar el tope a 2–4 GiB | Los SVS completos son el caso de uso; el problema es el tiempo después del último byte, no el tamaño |
| Leer el cuerpo en *streaming* con `MultipartReader` ahora | Más código propio; se acepta la doble copia hasta 2–3 GB y queda como seguimiento |
| Temporales en el montaje de las imágenes | Cargan el volumen lento y llenan el disco de las imágenes con temporales |
| Tratar todo 409 como «omitido» | Una imagen distinta con el mismo nombre se perdería en silencio; hay que poder renombrarla |
| 411 cuando falta `Content-Length` | El contrato 0.2.0 documenta para la subida 403, 413, 507 y variantes de 409; el 400 existente ya cubre una petición sin longitud |
| Claves canónicas sin distinguir mayúsculas | Una colisión ya da 409 `storage-key-in-use`; no hace falta otra regla |

**Consecuencias.** A favor: la URL y el contrato se conservan; ninguna subida sobrescribe un archivo ajeno; los SVS grandes dejan de fallar por el tiempo de espera de 300 s; una persona revocada no puede confirmar. En contra:

- Más superficie operativa: un volumen, un `location` y tres tiempos de espera.
- Un archivo huérfano en una clave da 409 `storage-key-in-use` hasta que el administrador global lo registre o lo quite. Los barridos de `.part` y de temporales ocurren solo al arrancar.
- Los administradores de proyecto pueden llenar el volumen: el preflight mira el espacio libre, pero no hay cuota.
- **No se construye ahora (seguimientos):** *streaming* con `MultipartReader` por encima de 2–3 GB; verificación de bytes mágicos (`tiles` ya rechaza contenido incorrecto); `OriginalFilename` real, separado de la clave; revisar el largo máximo de la clave (1024 en `StorageKeyValidator`) frente al de `OriginalFilename` (500); limitador de subidas concurrentes con 429; cuota por proyecto; recolector periódico; `SemaphoreSlim` alrededor de copias grandes; revisar los puertos solo en `127.0.0.1`; un tiempo de espera menor para el resto de `/api/` y una página 413 en `problem+json`.

**Verificación.**

- xUnit: `SaveFileAsync` crea-nuevo, conflicto, y escritores concurrentes sobre la misma clave donde el archivo de la ganadora queda intacto; mapeo del manejador; barrido. Con `TestServer` sobre la tubería real: el preflight responde 400, 413 y 507 enviando solo la cabecera, y una subida denegada no consume el cuerpo (bytes leídos muy por debajo del total).
- `scripts/test_authz_matrix.py` sobre Compose y PostgreSQL: sube una PNG real y lanza dos subidas concurrentes con el mismo nombre; debe dar exactamente un 201 y un 409, y el SHA-256 guardado es el de la ganadora.
- Vitest: filtro de archivos, reductor de la cola y cliente con un `XMLHttpRequest` simulado.
- Medición en la máquina de referencia: QS-4 con una subida en curso (se registra); una subida de 6 a 10 GB a través de Nginx, que debe completar; un archivo de más de 64 KB, que debe pasar por `uptmp`.
- QS-8 no cambia: ninguna ruta entrega `label` ni `macro`.

**Documentos a actualizar cuando la supervisión apruebe.**

- [ ] [`02-contexto-y-estrategia.md`](../arquitectura/02-contexto-y-estrategia.md): línea 31 («Montada **solo lectura**; … nunca subidas desde el navegador»), línea 15 (la flecha «solo lectura» de la Figura 1) y línea 35 («Dentro del sistema»: sumar la subida de imágenes).
- [ ] [`03-bloques-y-ejecucion.md`](../arquitectura/03-bloques-y-ejecucion.md): línea 15 («solo lectura» del volumen) y línea 23 (la flecha de `api` al volumen: también escribe); línea 42 («Montado solo lectura en `api` y `tiles`»); líneas 37-38 (gateway y SPA); línea 114 (componente `Images`); §6.2 (líneas 166-188): agregar la secuencia de subida desde el navegador.
- [ ] [`04-despliegue-y-conceptos.md`](../arquitectura/04-despliegue-y-conceptos.md): línea 16 (`:ro` en la Figura 7), línea 51 (volumen de `api` con `:ro`) y línea 63 (agregar `uptmp`); línea 187 (imágenes asociadas: la subida no las modifica).
- [ ] [`05-calidad-y-riesgos.md`](../arquitectura/05-calidad-y-riesgos.md): §11.2 (líneas 42-55): sumar la doble copia en disco, la falta de cuota y el barrido solo al arrancar.
- [ ] [`06-organizacion-y-roadmap.md`](../arquitectura/06-organizacion-y-roadmap.md) línea 140 (fila E4 «Registro de imágenes»: sumar la subida y ADR-17).
- [ ] `deploy/README.md`: el `location` de subida, el volumen `uptmp` y los tiempos de espera de 1800 s.
