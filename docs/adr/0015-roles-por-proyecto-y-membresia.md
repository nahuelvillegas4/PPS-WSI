# ADR-15. Roles por proyecto mediante membresías; el rol global queda en `admin` o `user`

**Estado:** `PROPUESTO` · **Fecha:** 31/10/2026 · **Decisores:** Nahuel Villegas (dueño), Gino Tombesi; valida la supervisión (cambio de alcance: ver más abajo)

**Contexto.** Hoy hay dos roles globales, `admin` y `annotator` ([ADR-04](0004-sesion-y-proteccion-de-teselas.md), §8.4), y toda persona autenticada ve todos los proyectos e imágenes. El pedido del 31/10/2026: el administrador global crea usuarios y les asigna un rol dentro de cada proyecto; cada persona ve solo los proyectos a los que está asignada; por ahora solo el administrador global crea proyectos; dentro de un proyecto hay administrador de proyecto (crea datasets, carga imágenes, asigna y desasigna usuarios, anota y visualiza), anotador (visualiza y anota) y visualizador (solo visualiza). Sobre quién crea cuentas, la respuesta fue «solo admin global por ahora, pero puede cambiar en un futuro». Restricciones: el contrato 0.1.0 se congela el 02/11/2026; [ADR-07](0007-modelo-de-datos-y-autoria.md) fija que solo el autor modifica su anotación; y el enunciado limita los roles (ver «Cambio de alcance»). Cómo se hace cumplir esta decisión está en [ADR-16](0016-autorizacion-por-proyecto-y-sesion.md); la subida de imágenes, en [ADR-17](0017-subida-de-imagenes-desde-el-navegador.md).

**Decisión.** Dos niveles de rol: el global decide qué se puede hacer en el sistema y la membresía decide qué se puede hacer en cada proyecto.

| Nivel | Valores (en el contrato) | Significado |
|---|---|---|
| Global (`users.role`) | `admin`, `user` | `admin` es administrador de proyecto implícito en todos los proyectos. `user` no ve nada hasta que lo asignan |
| Proyecto (`project_members.role`) | `project-admin`, `annotator`, `viewer` | Escalera estricta `viewer` < `annotator` < `project-admin`: visualizador, anotador y administrador de proyecto |

Cada permiso exige un rol mínimo de la escalera. Los roles nunca se comparan en SQL, porque el orden alfabético no es el de la escalera.

| Permiso | Rol mínimo | Habilita |
|---|---|---|
| `project.view` | `viewer` | Ver proyecto, datasets, clases, imágenes, teselas y las anotaciones de todos los autores |
| `annotation.write` | `annotator` | Crear anotaciones; editar y borrar las propias |
| `catalog.manage` | `project-admin` | Crear, editar y borrar datasets y clases |
| `image.upload` | `project-admin` | Subir imágenes ([ADR-17](0017-subida-de-imagenes-desde-el-navegador.md)) |
| `member.manage` | `project-admin` | Listar, agregar, cambiar de rol y quitar miembros |
| `dataset.export` | `project-admin` | Exportar el dataset |

`image.upload` y `dataset.export` en `project-admin` son supuestos: el pedido no los nombra. Aflojar un mínimo después es un cambio compatible del contrato; endurecerlo no lo es.

Solo el administrador global: gestionar usuarios (`/users`), crear, renombrar y borrar proyectos, listar el volumen (`GET /storage/files`), registrar imágenes por `storageKey` y la importación CRIC ([ADR-09](0009-importacion-por-adaptadores.md)). Renombrar no se delega porque el nombre es único en todo el sistema y el 409 lo devuelve: un administrador de proyecto podría descubrir qué proyectos existen.

**Membresía.** Tabla `project_members(project_id, user_id, role, created_at, updated_at, granted_by_user_id)` con clave primaria (`project_id`, `user_id`).

- `project_id` → `projects` con `CASCADE`: es la única excepción al `RESTRICT` de [ADR-07](0007-modelo-de-datos-y-autoria.md), porque una membresía es una asociación pura (`DELETE /projects` conserva su 409 si hay datasets). `user_id` → `users` con `RESTRICT`. `granted_by_user_id` es opcional y deja la auditoría.
- `CHECK` sobre `project_members.role`, generado desde la lista de roles del código, y `CHECK` sobre `users.role` (`admin`, `user`).
- La autoría de una anotación no depende de la membresía: sobrevive a que se quite a la persona.
- A la SPA el rol llega solo como `Project.myRole` (obligatorio, de solo lectura). `GET /auth/me` no cambia y los roles de proyecto no van en la cookie.

**Operaciones de miembros** (todas exigen `member.manage`):

| Operación | Respuestas relevantes |
|---|---|
| `GET /projects/{id}/members` | 200; anotadores y visualizadores no ven a sus compañeros (403) |
| `POST /projects/{id}/members` con `username` y `role` | 201; 404 `user-not-found`; 409 `already-member`; 429 |
| `PATCH /projects/{id}/members/{userId}` con `role` | 200; 404 si no hay membresía |
| `DELETE /projects/{id}/members/{userId}` | 204; las anotaciones de la persona se conservan |

**Quién crea cuentas.** Solo el administrador global (`POST /users`), sin autorregistro. El administrador de proyecto asigna usuarios que ya existen, por nombre exacto:

- No hay buscador de usuarios y `GET /users` sigue siendo del administrador global, que elige de la lista de usuarios activos.
- Un nombre desconocido, inactivo, de sistema o de un `admin` recibe la misma respuesta: 404 `user-not-found`. Tras 10 fallos en 10 minutos, quien consulta recibe 429. Cada intento se registra (quién, a quién, resultado).
- **Punto de extensión aditivo.** Si más adelante los administradores de proyecto deben crear cuentas: un campo `password` opcional en `POST /projects/{id}/members`, que crea la cuenta y la asigna, y un permiso de alta de cuentas en la matriz. Es un cambio compatible del contrato (campo opcional), elimina el riesgo de enumerar nombres y suma unas 100 líneas entre API y pantalla de miembros. No se construye ahora.

**404 o 403.** La respuesta no debe revelar qué existe fuera de los proyectos propios.

| Situación | Respuesta |
|---|---|
| Sin sesión | 401 |
| El recurso no existe, o existe en un proyecto del que la persona no es miembro | 404, con el mismo cuerpo salvo el `traceId` |
| Es miembro, pero su rol no alcanza el mínimo | 403 |
| Permiso exclusivo del administrador global sobre una ruta con recurso (registrar por `storageKey`, importar) | 403 para toda persona no administradora, exista o no el recurso |
| `GET /internal/v1/tile-access` | Solo 204, 401 o 403 (no miembro: 403), porque `auth_request` no admite otros códigos |

Como todo miembro es al menos `viewer`, las rutas con mínimo `viewer` nunca devuelven 403 por rol: el contrato documenta su 404 como «no existe o no es miembro». Para modificar o borrar una anotación el orden es 404, 403 por rol y 403 por autoría.

**Autoría y ciclo de vida.**

- [ADR-07](0007-modelo-de-datos-y-autoria.md) se mantiene: solo el autor edita o borra su anotación, también el administrador global. Quitar a una persona del proyecto no borra sus anotaciones, pero nadie más puede editarlas; si hace falta, se la vuelve a agregar como `annotator`.
- Pasar a un usuario a `admin` borra sus membresías en la misma transacción (no quedan filas dormidas). Pasarlo a `user` no le deja acceso hasta que lo asignen.
- El administrador inicial (`ADMIN_USERNAME`) no se puede desactivar ni degradar: 409 `protected-user`. Al arrancar, la API solo reactiva una fila existente con rol `admin` y nunca promueve a nadie.
- No hay regla de «último administrador de proyecto»: el administrador global lo es de todos y un recuento sería una condición de carrera. Quién concedió cada rol queda en `granted_by_user_id` y, con el rol anterior y el nuevo, en el log.

**Relleno al migrar.**

- Por defecto: cada usuario activo que no sea `admin` ni de sistema recibe `annotator` en todos los proyectos existentes y conserva así el acceso que tenía. Los inactivos no se rellenan, para que reactivarlos después no otorgue acceso masivo. Los roles de `users` distintos de `admin` pasan a `user`; ese `UPDATE` va antes de agregar el `CHECK`.
- Alternativa, **pendiente de decisión**: partir de cero, de modo que nadie ve ningún proyecto hasta que el administrador global lo asigne. Coincide al pie de la letra con el pedido y evita el SQL de relleno, su prueba y el procedimiento de limpieza (unas 60 líneas). En ambos casos los anotadores pierden exportar y subir.

**Qué reemplaza.** De [ADR-04](0004-sesion-y-proteccion-de-teselas.md), solo los roles de la política de usuarios (`admin` y `annotator`). El resto de esa política (administrador inicial por variables de entorno, altas solo por un administrador, sin autorregistro) no cambia y conserva su estado `PROPUESTO`; el mecanismo de sesión y de teselas sigue `DECIDIDO`. De §8.4, la fila «Usuarios» («todo usuario autenticado ve todas las imágenes»); de §11.2, la deuda «Roles mínimos».

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Rol global único (el modelo actual) | No distingue proyectos: toda persona autenticada ve todo |
| Tabla rol → conjunto de permisos, roles personalizados o reglas de denegación | Complejidad que el enunciado desaconseja; con roles anidados alcanza un rol mínimo por permiso. Se revisa solo si aparece un rol no anidado |
| Que el administrador de proyecto cree cuentas | El pedido lo limita al administrador global por ahora; queda el punto de extensión |
| Buscador de usuarios, o abrir `GET /users` a los administradores de proyecto | Permite enumerar todas las cuentas del sistema |
| 422 al asignar a un `admin` | Distingue «existe y es administrador» de «no existe» |
| Regla del «último administrador de proyecto» | El recuento es una condición de carrera y el administrador global recupera cualquier proyecto |
| Marca persistida de «usuario protegido» | Una columna más para lo que ya resuelve `ADMIN_USERNAME` |
| Que el administrador de proyecto renombre el proyecto | Habilita el oráculo de nombres descrito arriba |

**Consecuencias.** A favor: cada persona ve solo lo asignado; la matriz es una columna por permiso y cabe en un único fixture; la autoría no depende de la membresía; el alta de cuentas por administradores de proyecto se agrega sin romper nada. En contra:

- Cambios de comportamiento: los anotadores pierden exportar y subir (hoy cualquier usuario autenticado puede); listar el volumen y registrar por `storageKey` pasan a ser solo del administrador global (hoy están abiertos a cualquier usuario autenticado).
- Quitar a un autor congela sus anotaciones hasta que se lo vuelva a agregar. Un administrador de proyecto puede quitar o degradar a otros administradores del proyecto: no se bloquea, queda registrado.
- Quien asigna debe conocer el nombre de usuario exacto, que le llega fuera del sistema.
- Si se renombra `ADMIN_USERNAME`, el administrador anterior deja de estar protegido: caso de rotación aceptado y documentado.
- La migración reescribe roles y su `Down` pierde las asignaciones posteriores: se vuelve atrás con aplicación y esquema juntos. Volver solo la imagen de la aplicación hace fallar `POST /users` y la importación CRIC por el `CHECK` hasta bajar la base. Los scripts que crean usuarios `annotator` (por ejemplo `scripts/test_acceptance_i3.py`) pasan a `user` y asignan membresías.

**Cambio de alcance.** Este ADR ajusta el alcance y queda `PROPUESTO` hasta que la supervisión lo valide (PPS 1 §10, PPS 2 §9, §12.7).

- **Motivo.** El profesor pidió dejar la base de roles por proyecto y se encomendó también registrar imágenes subiéndolas desde el navegador ([ADR-17](0017-subida-de-imagenes-desde-el-navegador.md)); se quiere tener esa estructura antes de arrancar con las anotaciones.
- **Impacto.** PPS 1 §4 dice que «no se exige OIDC, recuperación de contraseñas ni gestión compleja de roles» y PPS 2 §3.3 pide autenticación local básica; los roles por proyecto van más allá. Además, §15 S12 propone altas de usuarios «sin pantalla»: las pantallas de usuarios y de miembros necesitan esta aprobación. Se ven afectados el contrato (0.1.0 → 0.2.0: `GlobalRole`, `ProjectRole`, `Project.myRole`, cuatro operaciones de miembros y errores nuevos), la API (migración con datos y autorización) y la SPA.
- **Plazo.** El contrato se congela el 02/11/2026. La versión 0.2.0 es anterior a 1.0 y sigue editable: entra antes del congelamiento y no se etiqueta 1.0.0 hasta tener la aprobación escrita. Hasta entonces tampoco se integra la migración (el primer cambio sobre datos) ni la pantalla de usuarios. Si la supervisión lo rechaza, se revierten 0.2.0 y este ADR antes de que haya datos cambiados.
- **Contrapartida de esfuerzo: `PENDIENTE`.** PPS 1 §10 y PPS 2 §9 piden retirar un alcance de esfuerzo comparable. Los estudiantes deben acordarlo con la supervisión; este ADR no lo propone ni lo supone. Cuando se acuerde se registra aquí y lo retirado pasa al backlog (§12.7).
- **Desvío de [ADR-13](0013-repositorio-unico.md).** ADR-13 pide un único PR atómico para un cambio que cruza contrato, API y SPA. Por el congelamiento, primero entra un PR solo de contrato (0.2.0 y `contract/fixtures/authorization-matrix.json`) y después los PR de API y web. ADR-13 no se reescribe: esta es una excepción acotada a este cambio.

**Verificación.** QS-3 se mantiene: un `PATCH` ajeno responde 403, también para el administrador global. El fixture `contract/fixtures/authorization-matrix.json` es la única tabla de mínimos y lo consumen cuatro verificadores ([ADR-16](0016-autorizacion-por-proyecto-y-sesion.md)). Prueba de la política (rol × permiso × sin hechos, no miembro, miembro y administrador); prueba del relleno sobre SQLite ejecutado dos veces (idempotente, sin administradores, de sistema ni inactivos) y de que el `CHECK` rechaza `annotator`. La migración, su `Down` y las violaciones 23505 y 23503 solo se prueban en PostgreSQL: ensayo con un volcado restaurado en una base descartable (actualizar, verificar, volver a la migración anterior, actualizar), adjunto al PR. La migración no se integra, con este ADR en `PROPUESTO`, sin la aprobación escrita de la supervisión.

**Documentos a actualizar cuando la supervisión apruebe.**

- [ ] [`04-despliegue-y-conceptos.md`](../arquitectura/04-despliegue-y-conceptos.md) línea 185 (fila «Usuarios» de §8.4); Figura 8 (líneas 108-158) y reglas de §8.2 (líneas 160-170): agregar `project_members` y los valores de `users.role`.
- [ ] [`05-calidad-y-riesgos.md`](../arquitectura/05-calidad-y-riesgos.md) línea 55 (deuda «Roles mínimos»).
- [ ] [`07-pendientes.md`](../arquitectura/07-pendientes.md) línea 18 (S12); sumar los pendientes de relleno frente a partir de cero, contrapartida de esfuerzo y retiquetado a 1.0.0.
- [ ] [`01-introduccion-y-restricciones.md`](../arquitectura/01-introduccion-y-restricciones.md) línea 61 (restricción «ni roles complejos»).
- [ ] [`06-organizacion-y-roadmap.md`](../arquitectura/06-organizacion-y-roadmap.md) líneas 106-117 (§13) y 131-147 (§14, fila E2 en la línea 138: sumar ADR-15 y ADR-16), según el paso 4 de §12.7 (línea 94).
- [ ] [`README.md`](../arquitectura/README.md) de arquitectura: línea 45 (fila «Usuarios»), líneas 50-56 (lo que se necesita de la supervisión), línea 68 (versión del contrato) y línea 99 (nueva fila del historial).
