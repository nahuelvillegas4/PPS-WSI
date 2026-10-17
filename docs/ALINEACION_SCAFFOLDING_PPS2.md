# Alineación del scaffolding de la PPS 2 con la línea base de arquitectura

**Resumen.** El scaffolding inicial de la API (commits `be327aa` y `23c0b5d`, 16 y 17/10/2026) se hizo sin la línea base de arquitectura v0.9 (commit `c206d18`, decisiones del 28/09/2026). Hay nueve diferencias técnicas, tres puntos a confirmar y varias correcciones de documentación ya aplicadas.

**Regla para resolverlas: manda la línea base.** Sus decisiones las acordaron los dos (ADR con estado `DECIDIDO`) y una decisión `DECIDIDO` solo se cambia con un ADR nuevo ([arquitectura §0.3](arquitectura/README.md)). Si alguna diferencia resulta intencional, se registra ese ADR en lugar de dejarla implícita.

No se borró contenido de Nahuel: los documentos que describen el estado actual quedaron con una nota que remite a este archivo.

## 1. Diferencias en código y configuración

Dueño: Nahuel (módulo `api/`, [ADR-13](adr/0013-repositorio-unico.md)). Momento natural: el incremento I0 ([roadmap §13](arquitectura/06-organizacion-y-roadmap.md)). Esta rama no cambia código: aquí no hay SDK de .NET para verificar el build.

| # | Tema | Scaffolding anterior | Línea base | Estado tras Día 1 |
|---|---|---|---|---|
| 1 | Carpeta | `backend/` | `api/` ([ADR-13](adr/0013-repositorio-unico.md)) | ✅ Resuelto: renombrado a `api/` con `git mv` |
| 2 | Compose | `backend/docker-compose.yml` | `compose.yaml` en la raíz ([ADR-11](adr/0011-un-compose-dos-entornos.md)) | ✅ Resuelto: `compose.yaml` en raíz integrando `db` (`postgres:18`) y `api` (.NET 10) |
| 3 | Secretos y entorno | Contraseña en compose | `.env` fuera del repo y `.env.example` ([ADR-12](adr/0012-privacidad-y-datos-de-prueba.md)) | ✅ Resuelto: `.env` en `.gitignore`, `.env.example` versionado |
| 4 | .NET y EF Core | .NET 8 / EF Core 8 | .NET 10 LTS y EF Core 10.x ([§2.4](arquitectura/01-introduccion-y-restricciones.md), [ADR-14](adr/0014-linea-base-de-versiones.md)) | ✅ Resuelto: migrado a `net10.0`, SDK 10.0.402 y Dockerfile multi-stage con runtime ASP.NET Core 10 |
| 5 | Base de datos | `postgis:16` | `postgres:18`, sin PostGIS ([ADR-07](adr/0007-modelo-de-datos-y-autoria.md)) | ✅ Resuelto: `postgres:18` estándar con healthcheck nativo `pg_isready` |
| 6 | Geometrías | NetTopologySuite | `jsonb` y validaciones en API ([ADR-07](adr/0007-modelo-de-datos-y-autoria.md), [§8.2](arquitectura/04-despliegue-y-conceptos.md)) | ✅ Resuelto: eliminado NetTopologySuite; polígonos mapeados como `jsonb` |
| 7 | Autenticación | JWT Bearer | Cookie `gia_session` y `PasswordHasher` ([ADR-04](adr/0004-sesion-y-proteccion-de-teselas.md)) | ✅ Resuelto: eliminado JWT; cookie `gia_session` con Data Protection persistido en `/keys` y PasswordHasher PBKDF2 |
| 8 | OpenAPI | Swashbuckle básico | OpenAPI contractual ([§12.4](arquitectura/06-organizacion-y-roadmap.md)) | ✅ Resuelto: Swashbuckle configurado para desarrollo, endpoints operativos documentados |
| 9 | Estructura interna | Capas genéricas | Estructura modular vertical ([§5.2](arquitectura/03-bloques-y-ejecucion.md)) | ✅ Resuelto: módulos `Auth`, `Catalog`, `Images`, `Annotations`, `Import`, `Export` y `TileAccess` |

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

- [x] **Horas por día y período de la PPS 2.** Confirmado por Nahuel: régimen de 7 semanas a 6 h por día del 19/10 al 03/12/2026 (200 horas estimadas en total).
- [ ] **Día 0 (16/10).** Es anterior al inicio del período (19/10). Confirmar con la supervisión si esas 4 horas de preparación cuentan.
- [x] **Nombre de la carpeta** (`backend/` o `api/`): Resuelto: carpeta renombrada a `api/` cumpliendo con ADR-13.
