# Interfaz web (PPS 1)

Aplicación de una sola página (React + TypeScript) que muestra las imágenes con **OpenSeadragon**. Por ahora tiene una sola función: **abrir una imagen y recorrerla con zoom y desplazamiento**, pidiendo las teselas al servicio [`tiles/`](../tiles/README.md) a medida que se necesitan. Antes de mostrar cualquier pantalla pide **iniciar sesión** contra la API (`/api/v1/auth/*`, cookie `gia_session`). Todavía no hay catálogo ni anotaciones.

El navegador habla solo con la pasarela (mismo origen): la SPA usa rutas relativas como `/tiles/v1/images/1.dzi`, así que el mismo artefacto sirve en local y en el servidor ([ADR-01](../docs/adr/0001-spa-y-dos-servicios-tras-pasarela.md)).

## Cómo se corre

Requiere Node 22.12 o superior.

```bash
cd web
npm ci
npm run dev        # http://localhost:5173, con proxy de /api y /tiles hacia la pasarela en :8080
```

El modo de desarrollo necesita la pasarela y el servicio de teselas levantados (`docker compose up -d --build` desde la raíz). Abrí `http://localhost:5173/images/1`.

## Cómo se prueba

```bash
npm test             # Vitest: conversión de coordenadas y URL de teselas
npm run typecheck    # TypeScript estricto
npm run lint         # ESLint (incluye la regla de dependencias)
npm run format       # Prettier
npm run build        # compila a web/dist
```

Las pruebas de conversión reproducen los casos C1, C2 y C3 de [`contract/fixtures/coordinates.json`](../contract/fixtures/coordinates.json), incluidas las trampas (multiplicar `y` por el alto) y el ida y vuelta del rectángulo.

## Dónde se toca cada cosa

| Archivo                                 | Responsabilidad                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/viewer/ImageViewer.ts`    | Interfaz que el editor usará; el editor **nunca** depende de OpenSeadragon ([arquitectura §5.2](../docs/arquitectura/03-bloques-y-ejecucion.md)) |
| `src/features/viewer/OsdImageViewer.ts` | Único archivo que importa OpenSeadragon (lo hace cumplir ESLint)                                                                                 |
| `src/features/viewer/coordinates.ts`    | Conversión pantalla ↔ nivel 0, el único lugar donde ocurre                                                                                       |
| `src/features/viewer/ViewerPage.tsx`    | Pantalla del visor: controles, tamaño, escala y coordenada bajo el cursor                                                                        |
| `src/features/viewer/tileSource.ts`     | URL del descriptor DZI de una imagen                                                                                                             |
| `src/shared/api.ts`                     | Cliente HTTP: rutas relativas, JSON y errores RFC 9457 (`ApiError`, `NetworkError`)                                                              |
| `src/features/auth/authApi.ts`          | `login`, `logout`, `fetchCurrentUser` y mensajes de error del ingreso                                                                            |
| `src/features/auth/useSession.ts`       | Estado de la sesión (consulta `/auth/me` al cargar)                                                                                              |
| `src/features/auth/LoginPage.tsx`       | Pantalla de ingreso                                                                                                                              |
| `src/app/App.tsx`                       | Puerta de sesión y rutas mínimas: `/` y `/images/{id}`                                                                                                              |

## Decisiones y límites

- **Sin CDN ni imágenes remotas.** Los botones de zoom son propios y OpenSeadragon no pide íconos; todo funciona sin Internet ([ADR-12](../docs/adr/0012-privacidad-y-datos-de-prueba.md)).
- **El clic simple no hace zoom.** Se reserva para las herramientas de anotación; el zoom es con la rueda, el doble clic o los botones.
- **La URL del descriptor se arma por convención** (`/tiles/v1/images/{id}.dzi`). Cuando la API sirva `GET /api/v1/images/{id}`, se usará el `tileSourceUrl` que devuelve.
- **Versiones.** `vitest` está en 5.0.5 y no en 5.0.2 (línea base §2.4): con `npm` 11.5.2, la 5.0.2 falla al instalarse con un error interno del resolutor. Es un cambio de parche (ADR-14).
- **Ingreso.** Sin sesión solo se ve la pantalla de ingreso y la URL no cambia: al ingresar se llega a la ruta pedida (p. ej. `/images/1`). Tras el `204` del login, la SPA confirma la sesión con `GET /auth/me` (la cookie es HttpOnly).
- **Pendientes:** volver a la pantalla de ingreso cuando la sesión vence con el visor abierto (QS-7), el catálogo, `SimpleImageViewer` para probar el editor sin teselas, y la generación de tipos desde `contract/openapi/api.v1.yaml`.
