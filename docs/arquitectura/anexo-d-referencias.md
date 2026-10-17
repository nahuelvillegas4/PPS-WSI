# Anexo D. Referencias

Versiones y datos consultados el 28/09/2026. Las URL de documentación cambian: si una no responde, buscar por el título.

**Fuentes del proyecto** (mandan en este orden)

- Enunciado «Práctica Profesional Supervisada 1 — Desarrollo de un MVP para visualización y anotación de imágenes médicas», 200 h.
- Enunciado «Práctica Profesional Supervisada 2 — Gestión, anotación e interoperabilidad de datasets de imágenes médicas», 200 h.
- Propuesta inicial de la PPS 1 (Gino Tombesi) y propuesta inicial de la PPS 2 (Nahuel Villegas).
- «Del vidrio al dataset — Guía de estudio PPS Imágenes Médicas», 31 páginas.

**Imágenes y visualización**

- OpenSlide 4.0.1 y openslide-python 1.4.6 — https://openslide.org/api/python/ (`DeepZoomGenerator`, `open_slide`, `ImageSlide`).
- openslide-bin 4.0.1.2 — https://pypi.org/project/openslide-bin/
- Datos de prueba de OpenSlide (CMU-1.svs y otros) — https://openslide.cs.cmu.edu/download/openslide-testdata/ (licencia: `VERIFICAR`).
- OpenSeadragon 6.1.1 — https://openseadragon.github.io/ y su changelog en GitHub.
- Deep Zoom File Format (Microsoft, documentación de Silverlight).
- CRIC Cervix — https://database.cric.com.br (formato y licencia: `VERIFICAR`). CCEDD: fuente y licencia `VERIFICAR`.

**Contratos y API**

- OpenAPI 3.1.0 — https://spec.openapis.org/oas/v3.1.0
- JSON Schema 2020-12 — https://json-schema.org/draft/2020-12
- RFC 9457, Problem Details for HTTP APIs — https://www.rfc-editor.org/rfc/rfc9457
- RFC 9110, HTTP Semantics (solicitudes condicionales, `ETag`, `If-Match`) — https://www.rfc-editor.org/rfc/rfc9110
- openapi-typescript 7.13.0 y openapi-fetch 0.17.0 — https://openapi-ts.dev
- ASP.NET Core 10, generación de documentos OpenAPI — https://learn.microsoft.com/aspnet/core/fundamentals/openapi/aspnetcore-openapi
- Npgsql EF Core, concurrencia optimista con `xmin` — https://www.npgsql.org/efcore/modeling/concurrency.html

**Formatos de exportación**

- COCO, formato de datos — https://cocodataset.org/#format-data
- Ultralytics, formato YOLO para detección — https://docs.ultralytics.com/datasets/detect/

**Seguridad, despliegue y arquitectura**

- Nginx, módulo `ngx_http_auth_request_module` — https://nginx.org/en/docs/http/ngx_http_auth_request_module.html (Nginx 1.30.5 estable).
- OWASP, Password Storage Cheat Sheet y Cross-Site Request Forgery Prevention Cheat Sheet — https://cheatsheetseries.owasp.org
- Docker Compose, `depends_on` y `healthcheck` — https://docs.docker.com/reference/compose-file/services/
- arc42 — https://arc42.org · Modelo C4 — https://c4model.com · ADR — https://adr.github.io

**Versiones verificadas en los registros de paquetes**

npm: react 19.3.0, vite 8.3.1 (Node ^20.19 o ≥ 22.12), typescript 5.9.3 (también 6.0.3 y 7.0.2), openseadragon 6.1.1, openapi-typescript 7.13.0, openapi-fetch 0.17.0, msw 3.0.0 (anterior 2.15.0), @tanstack/react-query 5.104.0, react-router 8.4.0, vitest 5.0.2, eslint 10.11.0, @playwright/test 1.63.0. PyPI: fastapi 0.141.1, pydantic 2.13.5, uvicorn 0.54.0, openslide-python 1.4.6, openslide-bin 4.0.1.2. Imágenes oficiales: nginx 1.30.5 (estable) y 1.31.6 (mainline); PostgreSQL 18 estable y 19 en beta.
