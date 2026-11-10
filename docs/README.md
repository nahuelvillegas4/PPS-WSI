# Documentación del Proyecto (PPS 1 + PPS 2)

Índice central de documentación técnica, operativa y académica de la **Plataforma de Gestión y Anotación de Imágenes Médicas**:

---

## 📚 Estructura de la Documentación

### 1. Manuales Operativos y Guías de Uso
En [`docs/manuales/`](manuales/README.md):
- [01. Despliegue y Operación con Docker Compose](manuales/01-despliegue-y-operacion.md)
- [02. Importación de Datasets CRIC](manuales/02-importacion-cric.md)
- [03. Exportación de Anotaciones e Interoperabilidad (COCO e Interno)](manuales/03-exportacion-formatos.md)
- [04. Guion de Aceptación Formal de la PPS 2 y Registro de Traspaso a PPS 1](manuales/04-guion-aceptacion-pps2.md)

### 2. Arquitectura del Sistema
En [`docs/arquitectura/`](arquitectura/README.md):
- Visión global, restricciones y objetivos de calidad.
- Descomposición en subsistemas y vistas de ejecución.
- Modelo de despliegue, almacenamiento y persistencia.
- Hoja de ruta por incrementos (I0 a I5) y trazabilidad de requerimientos.

### 3. Registro de Decisiones de Arquitectura (ADRs)
En [`docs/adr/`](adr/README.md):
- Registro de 17 decisiones técnicas acordadas (ADR-0001 a ADR-0017) que justifican el stack tecnológico, fronteras de servicios, modelo geométrico y estrategias de acceso.

### 4. Bitácoras Académicas de Seguimiento
- [`BITACORA_PPS2.md`](BITACORA_PPS2.md): Bitácora diaria y cómputo de horas de la PPS 2 (Nahuel — Backend, integración y persistencia).
- [`BITACORA_PPS1.md`](BITACORA_PPS1.md): Bitácora diaria de la PPS 1 (Gino — Frontend, visor WSI y teselas).

### 5. Documentos Institucionales de la Universidad
- [`PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf`](PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf): Enunciado y requerimientos de la PPS 1.
- [`PPS_02_Gestion_Anotacion_Datasets (1).pdf`](PPS_02_Gestion_Anotacion_Datasets%20%281%29.pdf): Enunciado y requerimientos de la PPS 2.
