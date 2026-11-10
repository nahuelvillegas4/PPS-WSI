# Manuales Operativos y Guías del Sistema

Compendio de manuales de administración, operación, importación/exportación y guiones de prueba de la **Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 1 + PPS 2)**:

---

## Índice de Manuales

1. [Manual de Despliegue y Operación con Docker Compose](01-despliegue-y-operacion.md)
   - Arquitectura del stack en contenedores (`gia-gateway`, `gia-web`, `gia-api`, `gia-tiles`, `gia-db`).
   - Requisitos de hardware y variables de entorno (`.env`).
   - Arranque, apagado, reinicio limpio e inspección de logs.
   - Persistencia de base de datos y claves criptográficas de sesión (`/keys`).

2. [Manual de Importación de Datasets CRIC](02-importacion-cric.md)
   - Especificación de formatos de entrada (CSV / JSON) y campos requeridos.
   - Algoritmo de conversión de centros nucleares puntuales a cajas delimitadoras (bounding boxes).
   - Mapeo automático de categorías citológicas del Sistema Bethesda a clases del dataset.
   - Ejecución en dos fases: simulación previa (`dryRun: true`) y persistencia atómica transaccional (`dryRun: false`).
   - Catálogo de errores estandarizados RFC 9457.

3. [Manual de Exportación de Anotaciones e Interoperabilidad](03-exportacion-formatos.md)
   - Especificación de formato interno documentado (`gia-annotations` v1.0).
   - Especificación de formato estándar COCO Object Detection.
   - Algoritmos de conversión geométrica (cajas `bbox`, polígonos `segmentation` y cálculo de área mediante fórmula Shoelace).
   - Filtrado multi-revisor por `userId` y descarga mediante API y cliente web.

4. [Guion de Aceptación Formal de la PPS 2 y Registro de Traspaso a PPS 1](04-guion-aceptacion-pps2.md)
   - Matriz de cumplimiento de criterios institucionales (PPS 2 §7).
   - Protocolo de ejecución automatizada del ensayo integral (`scripts/test_acceptance_i3.py`).
   - Especificaciones técnicas para el equipo de frontend (PPS 1): contrato OpenAPI, roles, concurrencia ETag y protección de teselas.

---

> [!TIP]
> También puede explorar la documentación interactiva en vivo accediendo a la ruta `/gia` de la aplicación web ([http://localhost:8080/gia](http://localhost:8080/gia)).
