# Alineación del scaffolding de la PPS 2 con la línea base de arquitectura

**Resumen.** El scaffolding inicial de la API (commits `be327aa` y `23c0b5d`, 16 y 17/10/2026) se hizo sin la línea base de arquitectura v0.9 (commit `c206d18`, decisiones del 28/09/2026). Hay nueve diferencias técnicas, tres puntos a confirmar y varias correcciones de documentación ya aplicadas.

**Regla para resolverlas: manda la línea base.** Sus decisiones las acordaron los dos (ADR con estado `DECIDIDO`) y una decisión `DECIDIDO` solo se cambia con un ADR nuevo ([arquitectura §0.3](arquitectura/README.md)). Si alguna diferencia resulta intencional, se registra ese ADR en lugar de dejarla implícita.

No se borró contenido de Nahuel: los documentos que describen el estado actual quedaron con una nota que remite a este archivo.

## 1. Diferencias en código y configuración

Dueño: Nahuel (módulo `api/`, [ADR-13](adr/0013-repositorio-unico.md)). Momento natural: el incremento I0 ([roadmap §13](arquitectura/06-organizacion-y-roadmap.md)). Esta rama no cambia código: aquí no hay SDK de .NET para verificar el build.

| # | Tema | Scaffolding hoy | Línea base | Qué hacer |
|---|---|---|---|---|
| 1 | Carpeta | `backend/` | `api/` ([ADR-13](adr/0013-repositorio-unico.md), [§12.1](arquitectura/06-organizacion-y-roadmap.md)) | `git mv backend api` en I0, o un ADR que enmiende ADR-13 si se prefiere `backend/` |
| 2 | Compose | `backend/docker-compose.yml` con `pps-db` y `pps-backend`; publica los puertos 5432 y 8080; `restart: always` | `compose.yaml` en la raíz con `gateway`, `api`, `tiles` y `db`; solo el gateway publica puerto; el reinicio automático va en `compose.server.yaml` ([ADR-11](adr/0011-un-compose-dos-entornos.md), [§7.1](arquitectura/04-despliegue-y-conceptos.md)) | Reemplazarlo por el Compose integrado en I0. Mientras tanto sirve para desarrollar la API sola |
| 3 | Secretos y entorno | Contraseña de la base y cadena de conexión escritas en el compose; `ASPNETCORE_ENVIRONMENT=Development` fijado en el Dockerfile | Solo variables de entorno; `.env` fuera del repositorio y `.env.example` documentado ([ADR-12](adr/0012-privacidad-y-datos-de-prueba.md), [§8.8](arquitectura/04-despliegue-y-conceptos.md)) | Pasar a `.env` y `.env.example`. Cambiar la contraseña actual: ya quedó en el historial de Git |
| 4 | .NET y EF Core | .NET 8, EF Core 8.0.8, Npgsql 8.0.4 | .NET 10 LTS y EF Core 10.x ([§2.4](arquitectura/01-introduccion-y-restricciones.md), [ADR-14](adr/0014-linea-base-de-versiones.md)) | Subir `TargetFramework`, paquetes e imágenes base del Dockerfile, con etiqueta exacta (`VERIFICAR`) |
| 5 | Base de datos | `postgis/postgis:16-3.4-alpine` | `postgres:18`, sin PostGIS ([ADR-07](adr/0007-modelo-de-datos-y-autoria.md), [§2.4](arquitectura/01-introduccion-y-restricciones.md)) | Cambiar la imagen. PostgreSQL 18 cambió la ruta de datos del volumen ([§7.1](arquitectura/04-despliegue-y-conceptos.md)) |
| 6 | Geometrías | NetTopologySuite y `Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite` | Se guardan como `jsonb`; la caja envolvente y el área las calcula la API ([ADR-07](adr/0007-modelo-de-datos-y-autoria.md), [§8.2](arquitectura/04-despliegue-y-conceptos.md)) y las reglas son las de [`geometry-validation.json`](../contract/fixtures/geometry-validation.json) | Quitar el mapeo espacial de EF Core. Si hace falta una librería de geometría para validar polígonos, lo decide el módulo y no cambia la base |
| 7 | Autenticación | JWT Bearer y BCrypt (paquetes referenciados; todavía no hay código que los use) | Cookie `gia_session` de ASP.NET Core y `PasswordHasher` ([ADR-04](adr/0004-sesion-y-proteccion-de-teselas.md)) | Quitar `JwtBearer` y `BCrypt.Net-Next` antes de implementar el ingreso |
| 8 | OpenAPI | Swashbuckle 6.6.2; Swagger en `:8080/swagger` | La OpenAPI del contrato es la fuente y la CI compara con ella la que genera la API ([§12.4](arquitectura/06-organizacion-y-roadmap.md)); .NET 10 trae su propio generador ([§2.4](arquitectura/01-introduccion-y-restricciones.md)) | Evaluar reemplazar Swashbuckle al subir de versión (`VERIFICAR`). Swagger UI sigue siendo útil en desarrollo |
| 9 | Estructura interna | `Pps.Domain`, `Pps.Infrastructure` y `Pps.Api` (capas) | API organizada por funcionalidad, con los formatos detrás de interfaces ([§5.2](arquitectura/03-bloques-y-ejecucion.md)) | No contradice si, dentro de los tres proyectos, las carpetas siguen los componentes de §5.2 (Auth, Catalog, Images, Annotations, Import, Export, TileAccess) |

**La diferencia 7 es la de más impacto.** OpenSeadragon pide las teselas sin cabeceras propias: con JWT en `Authorization` el token no llega al servicio de teselas, y por eso ADR-04 eligió la cookie. Cambiarla afecta también a la PPS 1.

## 2. Corregido en documentos

| Archivo | Qué se hizo |
|---|---|
| [`CONTRATO_INTEGRACION_PPS1_PPS2.md`](CONTRATO_INTEGRACION_PPS1_PPS2.md) | Marcado como propuesta superada por [`contract/`](../contract/README.md) (v0.1.0). Se agregó la tabla de equivalencias y el texto original quedó debajo |
| [`BITACORA_PPS2.md`](BITACORA_PPS2.md) | Plan alineado con los incrementos I0 a I4. El cronograma original se conserva plegado y la entrada del Día 0 no se tocó |
| [`BITACORA_PPS1.md`](BITACORA_PPS1.md) | Nueva, con el mismo formato y el plan de la PPS 1. Sin entradas: las completa quien trabajó cada jornada |
| [`../README.md`](../README.md) | Los enlaces absolutos a `c:/Users/nahue/...` (rotos para cualquier otra máquina) pasaron a relativos; se agregó el mapa de carpetas y el aviso de línea base |
| [`../backend/README.md`](../backend/README.md) | Aviso de estado y tabla «hoy / línea base» en lugar de afirmar un stack distinto del acordado |
| [`../.gitignore`](../.gitignore) | Se agregaron `.env` y `/data/` ([ADR-12](adr/0012-privacidad-y-datos-de-prueba.md), [§12.1](arquitectura/06-organizacion-y-roadmap.md)) |

`docs/arquitectura/`, `docs/adr/` y `contract/` no se modificaron: son la referencia.

## 3. A confirmar

- [ ] **Horas por día y período de la PPS 2.** La arquitectura ([§2.2](arquitectura/01-introduccion-y-restricciones.md)) dice 6 h por día del 19/10 al 03/12/2026 (7 semanas). La bitácora decía 5 h por día durante 40 días hábiles, un período más parecido al de la PPS 1 (5 h por día hasta el 16/12). Verificar en el enunciado: [`PPS_02_Gestion_Anotacion_Datasets (1).pdf`](PPS_02_Gestion_Anotacion_Datasets%20%281%29.pdf).
- [ ] **Día 0 (16/10).** Es anterior al inicio del período (19/10). Confirmar con la supervisión si esas 4 horas de preparación cuentan.
- [ ] **Nombre de la carpeta** (`backend/` o `api/`): decidir entre mover la carpeta o enmendar ADR-13.
