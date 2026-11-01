# Changelog del contrato

Formato basado en «Keep a Changelog». Hasta la 1.0 cualquier cambio sube la versión menor.

## [0.2.0] — 2026-10-31

Cambio de alcance: roles por proyecto y subida de imágenes desde el navegador (ADR-15, ADR-16 y ADR-17, en estado `PROPUESTO`). Sigue siendo anterior a la 1.0, de modo que se puede ajustar o revertir antes del congelamiento. La 1.0.0 no se etiqueta hasta contar con la aprobación de la supervisión.

### Agregado

- `openapi/api.v1.yaml`: esquemas `GlobalRole` (`admin`, `user`) y `ProjectRole` (`project-admin`, `annotator`, `viewer`), con la escalera `viewer` < `annotator` < `project-admin`. El administrador global actúa como `project-admin` en todos los proyectos.
- `Project.myRole`: campo obligatorio y de solo lectura con el rol de la sesión en el proyecto. La imagen no lleva un rol propio: se obtiene por `Image.datasetId`, `Dataset.projectId` y `Project.myRole`.
- Etiqueta `members` y cuatro operaciones de membresía: `listProjectMembers`, `addProjectMember`, `updateProjectMember` y `removeProjectMember` (`/api/v1/projects/{projectId}/members` y `/members/{userId}`), con los esquemas `ProjectMember`, `ProjectMemberList`, `AddProjectMemberRequest` y `UpdateProjectMemberRequest`. Solo el administrador global crea cuentas: el administrador de proyecto asigna usuarios que ya existen, por nombre exacto, sin búsqueda de usuarios. Un usuario que no se puede asignar responde siempre 404 `user-not-found`, y las búsquedas fallidas repetidas se limitan con 429.
- `GET /api/v1/users/{userId}` (`getUser`), que ya existía en la API y faltaba en el contrato.
- `POST /api/v1/datasets/{datasetId}/images/upload` (`uploadImages`): ya figuraba en la especificación 0.1.0, pero no en este registro ni en el resumen del anexo A.5. Ahora se documenta completa: campo multipart `files`, `Content-Length` obligatorio, rol mínimo, 403, 413 y 507, y las dos variantes de 409.
- Errores: 409 `already-member`, 409 `protected-user`, 404 `user-not-found`, 413 `payload-too-large`, 409 `storage-key-in-use` y 507 `insufficient-storage`. Respuestas reutilizables `PayloadTooLarge` e `InsufficientStorage`.
- `fixtures/authorization-matrix.json`: matriz de autorización con una fila por operación de `api.v1.yaml` (rol mínimo, permiso, ámbito y respuesta ante un usuario que no es miembro). Es la fuente única de los roles mínimos: la OpenAPI no usa extensiones `x-`.
- `scripts/check_contract.py`: bloque obligatorio (exige PyYAML) que verifica que cada operación de `api.v1.yaml` tiene exactamente una fila en la matriz, y viceversa, y que los permisos, mínimos y roles son coherentes.

### Cambiado (incompatible; permitido por ser anterior a la 1.0)

- `Role` se renombra `GlobalRole` y su valor `annotator` pasa a `user`. Alcanza a `CurrentUser.role`, `User.role`, `CreateUserRequest.role` y `UpdateUserRequest.role`. El rol dentro de un proyecto es ahora un concepto aparte (`ProjectRole`).
- `Project` gana el campo obligatorio `myRole` en todas las respuestas. Un campo obligatorio de respuesta no se puede agregar después de la 1.0 (anexo A.2): por eso entra ahora.
- La lectura ya no está abierta a cualquier sesión. `listProjects` devuelve solo los proyectos de los que el usuario es miembro (todos, para el administrador global); el resto de la lectura exige ser miembro (`viewer` o superior) y quien no lo es recibe 404, la misma respuesta que para un recurso inexistente.
- Roles mínimos nuevos: crear, editar y borrar anotaciones (editar y borrar además exigen ser el autor), `annotator`; catálogo (datasets y clases), subida de imágenes, exportación y miembros, `project-admin`. Los anotadores pierden la exportación y la subida, que antes tenían.
- `listStorageFiles` y `registerImages` pasan a ser exclusivas del administrador global; `importAnnotations` y la gestión de usuarios y proyectos ya lo eran. Cualquier otro usuario recibe 403, exista o no el recurso.
- `updateUser`: desactivar al administrador inicial o pasarlo a `user` responde 409 `protected-user`, y pasar un usuario a `admin` elimina sus membresías de proyecto.
- `authorizeTileRequest` (`tile-access`): responde 403 a quien no es miembro del proyecto de la imagen y 401 a un usuario desactivado. Sigue sin responder nunca 404 ni 302.
- `Forbidden`, `NotFound`, `Conflict`, `Unauthenticated` y `TooManyRequests` amplían su descripción a los casos nuevos. El 404 pasa a significar también «no es miembro».

### Estado de implementación en la API (01/11/2026)

Este registro describe el contrato, que va por delante de la API. La API ya cumple los roles por proyecto, los endpoints de miembros, `GET /projects` filtrado con `myRole`, `tile-access` por membresía y los marcadores de las 40 operaciones. **Todavía no aplica** estas respuestas ya documentadas: 429 al asignar miembros, 409 `protected-user` (y la baja de membresías al promover a `admin`), 413 `payload-too-large`, 507 `insufficient-storage`, 409 `storage-key-in-use` y el 400 por falta de `Content-Length` en la subida.

### Sin cambios

- `openapi/tiles.v1.yaml`, los esquemas JSON y los casos numéricos (`coordinates.json`, `dzi.json`, `export.json` y `geometry-validation.json`) conservan su contenido y la etiqueta 0.1.0 de su propio encabezado.

## [0.1.0] — 2026-09-28

### Agregado

- `openapi/api.v1.yaml`: autenticación, usuarios, proyectos, datasets, clases, archivos del volumen, imágenes, anotaciones con `ETag`/`If-Match`, importación con `dryRun`, exportación y `tile-access` interno.
- `openapi/tiles.v1.yaml`: DZI, teselas, inspección interna y salud.
- `schemas/geometry.schema.json` (rectángulo y polígono en nivel 0) y `schemas/internal-export.schema.json` (`gia-annotations` 1.x).
- Casos numéricos: `coordinates.json`, `dzi.json` (verificado con `DeepZoomGenerator`), `export.json` y `geometry-validation.json`.
- `scripts/check_contract.py` con la implementación de referencia de las reglas 422.
