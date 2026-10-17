# Pasarela (Nginx)

Es la única puerta del sistema: el navegador habla solo con ella, así que la cookie de sesión viaja sola a las teselas y no hay CORS que configurar ([ADR-01](../docs/adr/0001-spa-y-dos-servicios-tras-pasarela.md)). La construye la imagen de [`deploy/gateway/Dockerfile`](gateway/Dockerfile), que compila la SPA de [`web/`](../web/README.md) y la sirve junto con la configuración de Nginx.

## Qué hace cada ruta

| Ruta | Destino | Detalle |
|---|---|---|
| `/` y rutas de la SPA | Archivos estáticos | `try_files` con `index.html` como respaldo; `/assets/` se cachea sin vencimiento (nombres con hash) |
| `/api/` | `api:8080` | Reenvía con `X-Request-ID` |
| `/tiles/` | `tiles:8000` | Antes de reenviar pregunta a la API si hay sesión (`auth_request`) y agrega `X-Storage-Key` ([ADR-03](../docs/adr/0003-duenos-de-datos-y-resolucion.md), [ADR-04](../docs/adr/0004-sesion-y-proteccion-de-teselas.md)); descarta cualquier `X-Storage-Key` que mande el navegador |
| `/internal/` | — | Responde 404: nunca es alcanzable desde afuera |

Cada pedido recibe un `X-Request-ID` (`$request_id`) que se propaga a la API y a teselas y se devuelve al navegador.

## Cómo se corre

Desde la raíz del repositorio, con Docker Desktop abierto.

**Con la API completa** (cuando tenga ingreso y registro de imágenes):

```bash
cp .env.example .env
docker compose up -d --build
```

**Mientras tanto, sin ingreso** — todas las imágenes apuntan a una imagen de prueba, sin sesión ni autorización. Es solo para desarrollo y temporal ([`gateway/dev/`](gateway/dev/tiles-auth-sin-login.conf)):

```bash
python scripts/make_sample_image.py
docker compose -f compose.yaml -f compose.dev-sin-login.yaml up -d --build
```

Abrí <http://localhost:8080/images/1>. La API queda en <http://localhost:8081/swagger> solo para desarrollo.

## Dónde se toca cada cosa

| Archivo | Responsabilidad |
|---|---|
| `gateway/nginx.conf` | Rutas, proxys y caché |
| `gateway/snippets/security-headers.conf` | Cabeceras de seguridad y `X-Request-ID` (se incluye en cada `location` que define cabeceras propias) |
| `gateway/snippets/tiles-auth.conf` | La autorización real de teselas con la API |
| `gateway/dev/tiles-auth-sin-login.conf` | Reemplazo temporal de desarrollo (clave fija) |

## Límites a tener presentes

- **Los 401 y 403 de las teselas los genera Nginx**, con su página HTML, no con `problem+json`. La SPA ya los trata como falla de carga.
- **`auth_request` solo admite 204, 401 y 403** de la API; cualquier otro código se convierte en un 500. El endpoint `tile-access` hoy responde 404 si la imagen no existe: el contrato define solo 204, 401 y 403, así que habría que alinearlo (módulo de la PPS 2).
- **Pendiente:** `Content-Security-Policy` compatible con OpenSeadragon, TLS (P19) y fijar las etiquetas exactas de las imágenes base (ADR-14, `VERIFICAR`).
- **Probado en contenedores** (17/10/2026, `db`, `api`, `tiles` y `gateway` en estado `healthy`). Con la variante sin login: la SPA, el DZI y las teselas salen por la pasarela (117 teselas en el navegador, todas 200), `/internal/` responde 404, un `X-Storage-Key` enviado por el cliente se ignora y el `X-Request-ID` de Nginx llega a la API como `traceId`. Con la autorización real: sin sesión o con una cookie inventada, las teselas responden 401, es decir que `auth_request` llega a la API y esta rechaza.
- **Camino con sesión real, probado** (con el ingreso de la API del 17/10/2026): `POST /api/v1/auth/login` → cookie `gia_session` → con una imagen registrada en la base, la pasarela sirve el DZI y las teselas (`tile-access` responde 204 con `X-Storage-Key`); con una cookie inventada o sin sesión responde 401. El visor del navegador abre la imagen después de iniciar sesión y muestra el error de sesión antes.
- **Imagen no registrada → 500.** Confirmado: con sesión válida, `GET /tiles/v1/images/99.dzi` devuelve 500 porque `tile-access` responde 404 y Nginx registra `auth request unexpected status: 404`. Hay que alinear `tile-access` con el contrato (204, 401 o 403).
- **Caché del navegador.** Las teselas llevan `Cache-Control: private, max-age=86400`: tras cerrar sesión, el navegador puede seguir mostrando las que ya descargó. Es el comportamiento previsto en el contrato; al probar sesiones conviene usar una imagen que no se haya abierto.
