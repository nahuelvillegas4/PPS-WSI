# ADR-01. SPA y dos servicios detrás de una pasarela Nginx, en un único origen

**Estado:** `DECIDIDO` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** PPS 1 §4 impone OpenSlide en el servidor y OpenSeadragon en el navegador. Las propuestas eligieron FastAPI para las teselas (PPS 1) y ASP.NET Core para la API (PPS 2). Falta decidir cómo se ven esas piezas desde el navegador y cómo comparten la sesión.

**Decisión.** Tres piezas desplegables —SPA estática, `api` y `tiles`— detrás de Nginx en un único origen: `/` sirve la SPA, `/api/` va a la API y `/tiles/` al servicio de teselas. El navegador habla solo con Nginx.

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Un único backend (todo FastAPI o todo .NET) | Borra el reparto evaluable de las propuestas; OpenSlide no tiene bindings oficiales para .NET |
| Orígenes separados con CORS | La cookie no acompañaría a las teselas sin CORS con credenciales en dos servicios: más configuración y más superficie de ataque |
| La API como proxy de teselas | Todo el tráfico de imágenes pasaría por .NET y el rendimiento del visor dependería de la API |

**Consecuencias.** A favor: la cookie de sesión llega sola a las teselas; no hay CORS; cada servicio se construye, prueba y despliega por separado. En contra: el grupo mantiene dos lenguajes de backend. Lo mitigamos con un servicio de teselas chico, sin estado y con un contrato angosto, y lo dejamos planteado a la supervisión (Guía §9 P22). Nginx es una pieza más, cubierta por la prueba de humo.

**Verificación.** La prueba de humo pide SPA, API y DZI al mismo origen; ninguna respuesta incluye cabeceras CORS.
