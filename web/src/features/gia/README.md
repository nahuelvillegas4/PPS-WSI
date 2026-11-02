# Guía del sistema (`/gia`)

Pantalla de la SPA que muestra, con diagramas y tablas, qué es GIA, cómo funciona, cómo está hoy y cómo debería quedar. Se pensó para proyectarla en una reunión con la supervisión. Solo la ve una sesión con rol administrador global; es un control de la interfaz, no del servidor: el contenido viaja en el paquete estático y no es secreto.

## Cómo está armada

- **Contenido como datos.** Cada parada del recorrido (`stops/NN-nombre/`) y cada anexo (`anexos/`) exporta un `content` con su sección, sus diagramas y sus tablas. Los tipos están en `model/types.ts`; `model/registry.ts` los reúne y falla si un identificador se repite.
- **Componentes genéricos.** `render/` dibuja los bloques (tablas, tarjetas, pasos, cuadrantes...), `engine/` dibuja los diagramas con Mermaid y `nav/` resuelve el índice y el teclado. Quien escribe contenido solo toca datos.
- **Mermaid se carga bajo demanda.** `GiaPage` es un chunk aparte (`React.lazy` en `App.tsx`) y Mermaid se importa recién al dibujar el primer diagrama. Las demás pantallas no pagan nada.
- **Estado con tres señales.** Relleno, borde y glifo: ● implementado, ◐ parcial, ○ planificado, ? sin decidir. Los autores escriben la clase en línea (`:::done`) y el glifo con `g()` y `c()` de `model/diagramKit.ts`; nunca `classDef` ni colores.

## Cómo se evita que mienta

- Los totales se calculan de las filas; no se escriben a mano.
- `model/facts.ts` fija los números del sistema (operaciones, tablas, ADR...) y cada uno lo verifica una prueba contra el repositorio.
- `model/features.ts` lista lo que la página muestra como planificado, con una prueba que falla cuando alguien lo construye: el mensaje dice qué entrada actualizar.
- Los números que salen de ejecutar algo (pruebas, líneas) llevan fecha, commit y método (`model/status.ts`, `SNAPSHOT`).
- Una prueba rechaza contraseñas, puertos, nombres internos y palabras que prometen más de lo que hay (`protegida`, `aprobado`...).

Las pruebas de deriva leen archivos del repositorio y por eso solo corren en una copia completa; la imagen de la pasarela compila únicamente `web/` y ningún módulo de ejecución importa nada de `contract/`, `docs/` ni de `drift/`.

## Cómo actualizar un dato

1. Cambió un número del sistema: editá `model/facts.ts` y corré `npm test`; el test que falla indica de dónde sale el valor real.
2. Se construyó algo que figuraba como planificado: actualizá su entrada en `model/features.ts` y el contenido que lo menciona.
3. Cambió el estado de un requisito, un ADR o una operación: editá la fila en `data/`.
4. Siempre actualizá `SNAPSHOT` en `model/status.ts` (commit y fecha) y los valores de `data/measured.ts`.

## Dependencias

`mermaid` (ejecución, versión exacta) y `jsdom` (solo desarrollo, versión exacta, usado por una única prueba que valida la sintaxis de los diagramas). Ver [ADR-14](../../../../docs/adr/0014-linea-base-de-versiones.md). Mermaid emite estilos en línea: si el gateway incorpora una Content-Security-Policy, necesitará `style-src 'unsafe-inline'` o nonces.
