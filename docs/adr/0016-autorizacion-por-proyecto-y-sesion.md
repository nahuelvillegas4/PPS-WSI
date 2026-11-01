# ADR-16. Un único punto de autorización por proyecto, con sesión revalidada y teselas autorizadas por membresía

**Estado:** `PROPUESTO` · **Fecha:** 31/10/2026 · **Decisores:** Nahuel Villegas (dueño), Gino Tombesi; valida la supervisión junto con [ADR-15](0015-roles-por-proyecto-y-membresia.md)

**Contexto.** [ADR-15](0015-roles-por-proyecto-y-membresia.md) dice quién puede qué; falta decidir cómo se hace cumplir sin que un olvido deje una acción abierta. Hoy cada acción lleva `[Authorize]` o `[Authorize(Roles = "admin")]`, nada conoce el proyecto, la existencia del dataset se comprueba después del *model binding* y `tile-access` nunca consulta si el usuario sigue activo. La cookie dura 8 h y no se revalida contra la base. El repositorio no tiene flujos de CI, así que una regla que solo vive en una prueba puede no ejecutarse. Otras fuerzas: cada tesela pasa por `tile-access` ([ADR-03](0003-duenos-de-datos-y-resolucion.md), [ADR-04](0004-sesion-y-proteccion-de-teselas.md)) y QS-4 pide p95 ≤ 150 ms por tesela; el navegador guarda las teselas 24 h (`Cache-Control: private, max-age=86400`); y §8.4 declara una verificación de `Origin` para los métodos que modifican, pero en `api/src` no se encontró ninguna guarda de `Origin` ni de `Sec-Fetch-Site`, y la subida multipart ([ADR-17](0017-subida-de-imagenes-desde-el-navegador.md)) no puede cumplir la regla de aceptar solo JSON.

**Decisión.** Cada acción declara qué exige con un marcador; un filtro global decide antes de leer el cuerpo y falla cerrado ante cualquier duda.

*1. Piezas.*

| Pieza | Capa | Responsabilidad |
|---|---|---|
| `AccessPolicy.Decide(isGlobalAdmin, permission, facts?)` | Dominio, pura | Devuelve `Allowed`, `Hidden` (404) o `Denied` (403) y el rol efectivo. Sin hechos: `Hidden`. Administrador global: `Allowed` con rol efectivo `project-admin`. Sin membresía: `Hidden`. Rol bajo el mínimo: `Denied` |
| `PermissionMatrix` | Dominio | Permiso → rol mínimo de [ADR-15](0015-roles-por-proyecto-y-membresia.md) |
| `IProjectAccessReader` | Dominio, puerto | `FindScopeAsync(userId, scope)` y `FindImageForTileAsync(userId, imageId)`. Un puerto y un adaptador EF: una sola consulta SQL por llamada (proyección a `Dataset.ProjectId` más una subconsulta correlacionada por clave primaria en `project_members`) |
| `IAccessGate.EnsureAsync(user, permission, scope)` | API | Lee, decide y lanza `NotFoundProblemException` (un único `detail` constante) o `ForbiddenProblemException`; devuelve `(ProjectId, EffectiveRole)`. Lo usan el filtro y la re-verificación de la subida ([ADR-17](0017-subida-de-imagenes-desde-el-navegador.md)) |
| Marcadores | API | `[RequirePermission]`, `[RequireGlobalAdmin]` (equivale a `Authorize(Roles = "admin")`), `[AuthenticatedOnly]` y `[AllowAnonymous]` |
| `AccessGuardFilter` | API | `IAsyncAuthorizationFilter` global con `Order = -1000`, más `FallbackPolicy` = usuario autenticado |

*2. Flujo del filtro (falla cerrado).*

1. Reúne las declaraciones y los `IAllowAnonymous` de los metadatos del endpoint: debe haber exactamente una. Cero, o dos o más (incluido `[AllowAnonymous]` junto a un marcador), registran un error y responden 403. No se usa «gana el último»: el framework combina con AND todos los `IAuthorizeData`.
2. `[RequireGlobalAdmin]` y `[AuthenticatedOnly]` ya los aplica el framework: el filtro termina.
3. `[RequirePermission]` exige exactamente una clave de ruta entre `projectId`, `datasetId`, `classId`, `imageId` y `annotationId`; si no, lanza `InvalidOperationException` (500: es un error de programación). La clave define el ámbito (una anotación borrada lógicamente es 404) y se llama a `IAccessGate`.

- Corre antes del *model binding*. Sus excepciones llegan a `UseExceptionHandler`, así que `GiaExceptionHandler` no cambia. Los controladores conservan la comprobación de existencia y la de autoría ([ADR-07](0007-modelo-de-datos-y-autoria.md)).
- Un permiso exclusivo del administrador global sobre una ruta con recurso da 403 a toda persona no administradora, exista o no el recurso: no hay decisión que dependa del recurso y por lo tanto no hay oráculo.
- Los roles no se comparan en SQL: `ProjectRoles.AtLeast(min)` devuelve los nombres para una consulta `Contains`.
- La SPA repite la tabla (`features/access`) solo para ocultar controles; la API es la que autoriza. La tabla de la SPA se fija contra el mismo fixture.

*3. Teselas.* `GET /internal/v1/tile-access` lleva `[AuthenticatedOnly]` y decide a mano con una sola consulta (`FindImageForTileAsync`: clave de almacenamiento, si el usuario está activo y los hechos de membresía).

| Caso | Respuesta |
|---|---|
| Sin cookie, o usuario inactivo en la base | 401 |
| Imagen inexistente, no miembro o URI inválida | 403 (nunca 404) |
| Miembro (`viewer` o más) o administrador global | 204 con `X-Storage-Key` |

Nunca lanza excepciones del catálogo de errores: `auth_request` solo admite 204, 401 y 403 ([ADR-04](0004-sesion-y-proteccion-de-teselas.md)). **Puerta de QS-4:** se mide `tile-access` aislado (2.000 pedidos, 8 concurrentes, directo a la API en `127.0.0.1:8081`) antes y después del cambio a denegar por defecto, y debe dar p95 ≤ 10 ms absolutos. Se registran, sin condicionar, el p95 de extremo a extremo y el p95 mientras corre una subida de 1 a 2 GB. Si la puerta falla, se agrega una caché de 5 s por (usuario, imagen): es la deuda ya anotada en §11.2 y suma hasta 5 s de retraso a una revocación.

*4. Frescura de la sesión.* `SessionValidator` en `OnValidatePrincipal`, con `IMemoryCache`, clave `session:{id}` y 10 s de vida. Guarda (activo, rol global, sello) leídos por clave primaria. El sello son los primeros 16 caracteres de Base64(SHA-256(hash de contraseña)) y se pone también en la cookie al ingresar. Si el usuario no existe, está inactivo o cambió su rol o su sello, se rechaza y se cierra la sesión: un cambio de contraseña también corta una cookie robada. `PATCH /users` desaloja la clave ante cualquier cambio. Los roles de proyecto nunca se cachean ni van en la cookie: cada pedido los lee en su consulta. **Punto abierto para la unidad de sesión:** el sello deriva del hash de contraseña y viaja en la cookie. Un valor aleatorio por usuario o la columna `session_version` evitan exponer un derivado del verificador de la contraseña, a costa de un cambio de esquema; se decide al implementar, con quien lleva la API.

*5. CSRF.* `FetchMetadataGuardMiddleware` (unas 25 líneas): en POST, PUT, PATCH y DELETE bajo `/api/`, si llega `Sec-Fetch-Site` y no vale `same-origin` ni `none`, responde 403. `SameSite=Lax` se mantiene. Por qué la subida lo exige: §8.4 se apoya en que las rutas que modifican solo aceptan `application/json`, pero `multipart/form-data` es uno de los tres tipos que un formulario HTML de otro sitio puede enviar sin *preflight* CORS y la subida debe aceptarlo; el tipo de contenido deja de alcanzar. `Sec-Fetch-Site` lo fija el navegador y el código de la página no puede alterarlo. Límite: si el navegador no envía la cabecera, la guarda no actúa y queda `SameSite=Lax`.

*6. Teselas en la caché del navegador (latencia aceptada).* Un miembro quitado o un usuario desactivado puede seguir viendo en su navegador las teselas ya descargadas hasta 24 h. No se acorta: pondría un `auth_request` por tesela otra vez en la ruta de QS-4 y tocaría el módulo de teselas. Mitigación: el cierre de sesión responde `Clear-Site-Data: "cache"` y borra la caché de ese navegador (`VERIFICAR`: soporte según navegador y solo en contexto seguro; TLS del servidor sigue `PENDIENTE`, P19). No cubre una revocación con la sesión abierta.

*7. Orden de entrega.* Pasar de «abierto» a «denegar por defecto» es el paso de más riesgo: una clave de ruta equivocada deja sin acceso a quien trabaja. Por eso el orden es parte de la decisión:

1. Endurecimiento de arranque (punto 8), sobre las migraciones existentes, para que cualquier desvío del modelo aparezca solo.
2. Endpoints de miembros, con `[RequireGlobalAdmin]` provisorio, para que siempre se pueda asignar gente.
3. Un marcador en cada acción, con el filtro todavía sin registrar.
4. Registro del filtro y de `FallbackPolicy`, `member.manage` en lugar del marcador provisorio y `tile-access` por membresía, en su propio commit. Si no está integrado el 13/11/2026, se entrega hasta el paso 3 con el filtro sin activar y se documenta.

*8. Endurecimiento de arranque.*

- Una migración que falla detiene la API. Solo se reintentan los errores transitorios de conexión (`NpgsqlException.IsTransient`, `TimeoutException`), `Database:StartupRetries` veces (15 × 2 s por defecto); cualquier otra falla se relanza y el proceso termina. Un modelo con cambios sin migración también la detiene (EF Core 9 o posterior lanza): una prueba sin base compara el *snapshot* con el modelo (`IMigrationsModelDiffer`) y `dotnet ef migrations has-pending-model-changes` entra al checklist.
- `Database:AutoMigrate` (verdadero por defecto); el anfitrión de pruebas lo apaga.
- Sin contraseña de administrador por defecto en el código: un primer arranque sin `ADMIN_PASSWORD` falla.
- `compose.yaml`: `api` con `restart: on-failure:3` y `stop_grace_period: 60s`; el chequeo de `db` usa `pg_isready -h 127.0.0.1` porque el servidor de inicialización solo escucha en el socket; los puertos de `db` y `api`, hoy publicados en todas las interfaces, pasan a `127.0.0.1`.
- `/health/ready` devuelve razones constantes (la excepción va al log) y 503 con migraciones pendientes (solo Npgsql).
- `scripts/backup-db.sh`, citado en §7.3 y en el árbol de §12.1 pero inexistente hoy, y `scripts/restore-db.sh`, que el ensayo de migración de [ADR-15](0015-roles-por-proyecto-y-membresia.md) necesita y ningún documento menciona, se crean con este punto.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Políticas con nombre, con proveedor y manejador de resultado propios | Producir un 404 en lugar de un 403 exige tres puntos de extensión del framework; una clase propia lanza las excepciones del repositorio y corre antes del *binding*. Es menos idiomático, a cambio de un solo dueño del comportamiento |
| Comprobaciones imperativas en cada acción | Un olvido deja la acción abierta y no hay CI que lo detecte |
| Filtros de consulta globales de EF | No distinguen 404 de 403 y esconden la regla dentro de las consultas |
| «Gana el último marcador» | El framework combina con AND todos los `IAuthorizeData`: un marcador no puede anular a otro |
| Un cuarto marcador `[SelfAuthorized]` y el ámbito de `tile-access` tomado de `X-Original-URI` | Una lista permitida en una prueba y las pruebas de humo fijan lo mismo; el ámbito de las teselas viene de una cabecera, no de la ruta |
| Un puerto aparte para teselas, o que `tile-access` ejecute su propia SQL | Dos puertos y dos consultas para lo mismo; un puerto con dos métodos deja la política probable sin EF y la ruta de teselas en una consulta |
| Leer la base en cada pedido para validar la sesión | Suma una lectura a cada llamada, teselas incluidas |
| Columna `session_version` | Cambio de esquema que el sello derivado del hash de contraseña evita; se reconsidera en la unidad de sesión (punto abierto del apartado 4) |
| Roles de proyecto en la cookie | Quedarían desactualizados hasta 8 h: un miembro quitado conservaría el acceso |
| Acortar la caché de teselas de 24 h | Vuelve a poner un `auth_request` por tesela en la ruta de QS-4 y toca el módulo de teselas |
| Un solo cambio grande, o una bandera `Access:FailClosed` | Mezcla marcadores, endpoints y el cambio a denegar por defecto en un paso; el orden de entrega separa los riesgos |

**Consecuencias.** A favor: una sola clase decide; un olvido da 403 con un error en el log y no una acción abierta; la política se prueba sin base de datos ni HTTP; la ruta de teselas hace un *join* y dos subconsultas por clave primaria. En contra, y aceptado:

- Hasta 10 s de retraso si un cambio de rol global o una baja no desaloja la caché. Supone una única instancia de la API (coherente con la deuda de §11.2) y toda cookie anterior al despliegue se rechaza una vez: un reingreso.
- Las teselas ya descargadas siguen visibles hasta 24 h (punto 6). Sin `Sec-Fetch-Site` (navegadores antiguos) solo queda `SameSite=Lax`.
- El cambio a denegar por defecto puede bloquear a quien trabaja si una clave de ruta es incorrecta. Se mitiga con el filtro que falla cerrado y deja un error en el log, la prueba por reflexión, las pruebas de humo y porque los endpoints de miembros llegan antes.
- Una dependencia más, solo de pruebas: `Microsoft.AspNetCore.Mvc.Testing`, versión exacta 10.0.13, con la nota que pide [ADR-14](0014-linea-base-de-versiones.md).
- El bloqueo de ingreso sigue pendiente: cualquiera sin sesión puede provocar el bloqueo por intentos fallidos y dejar fuera al administrador sembrado durante 5 minutos; el contador está en memoria y `docker compose restart api` lo limpia. Llevar la cuenta por dirección IP requiere configurar `ForwardedHeaders`. Ya existía; se difiere y queda anotado.

**Verificación.**

- `AuthorizationMatrixTests` (reflexión): cada acción tiene exactamente una declaración; su verbo y ruta equivalen a una fila del fixture `contract/fixtures/authorization-matrix.json` y el permiso declarado es el de la fila (salvo las filas con `manualGate`, listar proyectos y `tile-access`, que llevan `[AuthenticatedOnly]` y aplican el permiso a mano: las cubren las pruebas de humo); `RequirePermission` tiene una sola clave de ámbito; el conjunto `AuthenticatedOnly` es la lista permitida (cierre de sesión, `me`, listar proyectos y `tile-access`). El fixture lo consumen también Vitest, `scripts/check_contract.py` y `scripts/test_authz_matrix.py`.
- Pruebas unitarias: tabla de `AccessPolicy`; `EfProjectAccessReader` por cada tipo de ámbito (anotación borrada y no miembros incluidos); el filtro con un lector falso (404, 403, permitido, cero o dos declaraciones, `[AllowAnonymous]` con marcador y clave de ámbito ausente); `SessionValidator` (inactivo, rol distinto, sello distinto, desalojo); la guarda `Sec-Fetch-Site`.
- Unas 14 pruebas de humo con `WebApplicationFactory` sobre SQLite. Obligatorias: listar proyectos como persona externa (vacío), miembro (solo los suyos) y administrador (todos); `tile-access` de un miembro quitado → 403, de un miembro → 204 y de un inactivo → 401. También: 401 sin cookie; 404 de no miembro con cuerpo idéntico al de recurso inexistente salvo el `traceId`; 403 de un `viewer` que anota; subida rechazada antes de leer el cuerpo (bytes consumidos muy por debajo del total, por ejemplo menos de 1 MiB de 64 MiB); usuario desactivado → 401; rol o sello distintos → 401; `Sec-Fetch-Site` de otro sitio → 403.
- `scripts/test_authz_matrix.py` sobre Compose y PostgreSQL: crea administrador global, administrador de proyecto, anotador, visualizador y persona externa, y exige el 403 o 404 exacto de cada actor denegado. Empieza pidiendo `GET /tiles/v1/images/{id}.dzi` sin cookie y aborta si no responde 401: una superposición de desarrollo sin autenticación de teselas invalida la prueba. Lo exclusivo de PostgreSQL (`CHECK`, 23505, 23503, migración y `Down`) se cubre con este script y con el ensayo de migración de [ADR-15](0015-roles-por-proyecto-y-membresia.md); Testcontainers se descartó (sin CI y no todas las máquinas tienen Docker).
- QS-4 con la puerta de `tile-access` descrita en el punto 3.

**Documentos a actualizar cuando la supervisión apruebe.**

- [ ] [`04-despliegue-y-conceptos.md`](../arquitectura/04-despliegue-y-conceptos.md): línea 180 (fila «Sesión»: revalidación de 10 s y sello) y línea 184 (fila CSRF: guarda `Sec-Fetch-Site` y multipart); agregar a §8.4 las filas de autorización por proyecto y de teselas en la caché del navegador (líneas 178-191); línea 36 (pie de la Figura 7: «Solo el `gateway` publica un puerto»); esqueleto de Compose (líneas 40-64: reinicio, chequeo de `db`); línea 66 (arranque: migraciones y administrador inicial); línea 89 (copias de seguridad) y tabla de §7.3 (líneas 82-90: `Database:AutoMigrate`, `Database:StartupRetries`).
- [ ] [`03-bloques-y-ejecucion.md`](../arquitectura/03-bloques-y-ejecucion.md): línea 37 (el gateway como «único puerto publicado»), línea 112 (componente «Auth y Users»: agregar el control de acceso) y línea 118 (`TileAccess`: autoriza por membresía); Figura 5 (líneas 192-214) y línea 216 (un no miembro recibe 403).
- [ ] [`05-calidad-y-riesgos.md`](../arquitectura/05-calidad-y-riesgos.md): línea 10 (QS-4: puerta aislada de p95 ≤ 10 ms), línea 13 (QS-7: frescura de la sesión), línea 14 (QS-8: 403 a no miembros), línea 51 (deuda «Autorización por tesela sin caché»: caché de 5 s como respaldo); sumar en §11.1 el riesgo del cambio a denegar por defecto y en §11.2 la latencia de 24 h de las teselas y el bloqueo de ingreso diferido.
- [ ] `deploy/README.md`: advertir que la superposición de desarrollo sin autenticación de teselas no sirve para probar roles.

**Estado de implementación (01/11/2026).** Implementado: `AccessPolicy` (dominio, pura), `IProjectAccessReader` con su lector EF de una sola consulta, `IAccessGate`, el `AccessGuardFilter` global que falla cerrado, la política de respaldo «usuario autenticado», un marcador en cada una de las 40 operaciones (la prueba por reflexión lo verifica contra el fixture) y `tile-access` por membresía (204, 401 para un usuario inactivo, 403 para un no miembro). **Pendiente, no implementado:** el validador de sesión con sello y caché de 10 s, la guarda `Sec-Fetch-Site`, el endurecimiento del arranque (reintentos y contraseña por defecto), el anfitrión de pruebas `WebApplicationFactory`, los scripts de respaldo y la medición de QS-4. Hasta que exista el validador de sesión, desactivar a un usuario o cambiar su rol global no corta una cookie ya emitida (hasta 8 horas).
