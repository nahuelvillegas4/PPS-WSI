# Plataforma de Gestión y Anotación de Imágenes Médicas (PPS 2)

Proyecto de Práctica Profesional Supervisada para la gestión, anotación geométrica e interoperabilidad de datasets de imágenes médicas (WSI y microscopía convencional).

---

## 📁 Organización del Repositorio

- **[`/backend`](file:///c:/Users/nahue/Desktop/Facultad/PPS/backend):** Contiene todo el código fuente del backend en .NET 8 (Clean Architecture), Dockerfile, docker-compose y configuración de base de datos PostgreSQL + PostGIS.
- **[`/docs`](file:///c:/Users/nahue/Desktop/Facultad/PPS/docs):** Contiene la documentación del proyecto y los requerimientos académicos:
  - [`PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf`](file:///c:/Users/nahue/Desktop/Facultad/PPS/docs/PPS_01_Plataforma_Anotacion_Imagenes_Medicas.pdf): Requerimientos de PPS 1 (Visor WSI con OpenSlide y OpenSeadragon).
  - [`PPS_02_Gestion_Anotacion_Datasets (1).pdf`](file:///c:/Users/nahue/Desktop/Facultad/PPS/docs/PPS_02_Gestion_Anotacion_Datasets%20(1).pdf): Requerimientos de PPS 2 (Backend de Anotaciones y Datasets).
  - [`BITACORA_PPS2.md`](file:///c:/Users/nahue/Desktop/Facultad/PPS/docs/BITACORA_PPS2.md): Registro oficial diario para la universidad (200 horas / 40 días hábiles).
  - [`CONTRATO_INTEGRACION_PPS1_PPS2.md`](file:///c:/Users/nahue/Desktop/Facultad/PPS/docs/CONTRATO_INTEGRACION_PPS1_PPS2.md): Especificación técnica de integración y coordenadas nivel 0 entre ambos módulos.

---

## 🚀 Inicio Rápido (Backend)

Para levantar el backend completo con PostgreSQL y PostGIS:

```powershell
cd backend
docker compose up -d --build
```

Documentación interactiva Swagger: [http://localhost:8080/swagger](http://localhost:8080/swagger)
