# ADR-04. Sesión por cookie de punta a punta y teselas protegidas con `auth_request`

**Estado:** `DECIDIDO` (mecanismo) · `PROPUESTO` (política de usuarios) · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** La autenticación es local y básica, con administrador inicial (PPS 1 §4, PPS 2 §3.3). OpenSeadragon pide teselas sin cabeceras propias, de modo que un token en `Authorization` obligaría a cambiar cómo carga las teselas. Además, las teselas son imágenes médicas y deben requerir sesión (Guía §9 P19).

**Decisión.**

- ASP.NET Core emite la cookie `gia_session` (HttpOnly, SameSite=Lax, `Secure` según entorno). Como todo es del mismo origen, el navegador la adjunta a las teselas sin configurar el visor.
- `/internal/v1/tile-access` responde 204, 401 o 403 y **nunca redirige**: `auth_request` trata cualquier otro código como error. En ASP.NET Core 10 los endpoints de API no redirigen al ingreso; para los que el framework no reconozca como API se configuran los eventos de la cookie para responder 401 o 403 (`VERIFICAR` en el esqueleto).
- FastAPI no maneja sesiones. Las claves de Data Protection se persisten; las contraseñas usan `PasswordHasher`; el ingreso tiene límite de intentos.
- Política de usuarios (`PROPUESTO`): roles `admin` y `annotator`; administrador inicial por variables de entorno; altas solo por un administrador (endpoint y script); sin autorregistro.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| JWT en `Authorization` | El navegador no lo envía solo a las teselas: habría que cargarlas por AJAX y guardar el token en JavaScript, expuesto a XSS |
| JWT en una cookie propia | Mismas propiedades que la cookie de ASP.NET Core, más validación propia en dos servicios |
| Teselas públicas | Incompatible con el objetivo de confidencialidad |
| Autorregistro (lo menciona la propuesta PPS 2) | Cualquiera con acceso a la red podría crear una cuenta y ver imágenes |

**Consecuencias.** A favor: un solo mecanismo de sesión, sin tokens en JavaScript, y teselas protegidas sin código en el servicio de teselas. En contra: hay que cuidar CSRF (§8.4), y el alcance no incluye una pantalla de alta de usuarios (§15).

**Verificación.** QS-7 y QS-8. Pruebas de integración: `tile-access` sin cookie → 401; usuario inactivo → 401; intentos fallidos repetidos → 429.
