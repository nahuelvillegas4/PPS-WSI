# ADR-11. Un Compose, dos entornos: configuración en lugar de código

**Estado:** `DECIDIDO` · alternativa de máquina virtual: `PROPUESTO` · **Fecha:** 28/09/2026 · **Decisores:** Gino Tombesi, Nahuel Villegas

**Contexto.** PPS 1 §3.8 pide ejecutar el sistema en el servidor del laboratorio y PPS 2 §3.9 levantar el módulo integrado con Docker Compose. El servidor todavía no está especificado (Guía §9 P18).

**Decisión.** Un `compose.yaml` único, un `.env` y un `compose.server.yaml` para el servidor. La SPA usa rutas relativas; no hay hosts ni rutas en el código. Las migraciones y el administrador inicial se aplican al arrancar. Healthchecks con `depends_on: service_healthy`, y `restart: true` para que la API se reinicie si se reinicia la base. Scripts versionados: `fetch-samples`, `smoke` y `backup-db`. Si el servidor no está disponible a tiempo, la aceptación se hace en una máquina virtual limpia con la misma configuración (`PROPUESTO`, PPS 1 §10).

**Alternativas descartadas.**

| Alternativa | Por qué no |
|---|---|
| Un Compose por entorno | Divergen con el tiempo |
| Kubernetes | Sobredimensionado para un servidor de laboratorio |
| Instalación sin contenedores | No es reproducible |

**Consecuencias.** A favor: lo que se prueba en local y en la CI es lo que corre en el servidor. En contra: en Windows hace falta WSL2 (R9).

**Verificación.** QS-5; la prueba de humo del Compose corre en la CI.
