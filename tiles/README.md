# Servicio de teselas (PPS 1)

Entrega una imagen en pedacitos para que el navegador no tenga que descargarla entera: el descriptor **Deep Zoom (DZI)** y las **teselas JPEG** que se ven en pantalla, generados al vuelo con OpenSlide ([ADR-02](../docs/adr/0002-teselas-dzi-al-vuelo.md)). También informa los metadatos técnicos de un archivo cuando la API registra una imagen.

No tiene estado: no conoce usuarios ni base de datos. Recibe la clave del archivo en la cabecera `X-Storage-Key`, que agrega la pasarela después de que la API autorizó el pedido ([ADR-03](../docs/adr/0003-duenos-de-datos-y-resolucion.md)). El contrato está en [`contract/openapi/tiles.v1.yaml`](../contract/openapi/tiles.v1.yaml).

## Cómo se corre

Desde esta carpeta, con un entorno virtual:

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements-dev.txt   # en Linux o macOS: .venv/bin/python
```

Generá la imagen de prueba (desde la raíz del repositorio) y levantá el servicio:

```bash
python scripts/make_sample_image.py
IMAGES_ROOT=../data/images .venv/Scripts/python -m uvicorn app.main:create_app --factory --port 8000
```

Probalo:

```bash
curl -H "X-Storage-Key: samples/prueba-1376x1020.png" http://127.0.0.1:8000/tiles/v1/images/1.dzi
```

Dentro de Docker se levanta con el `compose.yaml` de la raíz, que monta el volumen de imágenes en solo lectura.

| Variable | Por defecto | Para qué |
|---|---|---|
| `IMAGES_ROOT` | `/data/images` | Carpeta del volumen de imágenes |
| `SLIDE_CACHE_SIZE` | `8` | Cantidad de slides abiertos que se conservan (LRU) |
| `TILE_JPEG_QUALITY` | `85` | Calidad JPEG de las teselas |

El tamaño de tesela (254) y el overlap (1) **no** se configuran: los fija el contrato y los casos numéricos dependen de ellos. El tamaño de la imagen tampoco se configura: sale de cada archivo.

## Cómo se prueba

```bash
.venv/Scripts/python -m pytest      # 24 pruebas
.venv/Scripts/python -m ruff check . && .venv/Scripts/python -m ruff format --check .
.venv/Scripts/python -m mypy
```

Las pruebas usan imágenes generadas en un directorio temporal y comparan el DZI y las teselas con el caso D2 de [`contract/fixtures/dzi.json`](../contract/fixtures/dzi.json). El caso D1 (WSI de 100.000 × 80.000) lo verifica [`scripts/check_contract.py`](../scripts/check_contract.py) con `DeepZoomGenerator`.

## Dónde se toca cada cosa

| Archivo | Responsabilidad |
|---|---|
| `app/main.py` | Fábrica de la aplicación, `X-Request-ID` y logs JSON |
| `app/routes.py` | Rutas DZI, teselas, `inspect` y salud |
| `app/storage.py` | `StorageKeyResolver`: solo claves relativas, sin `..`, dentro del volumen |
| `app/slides.py` | Apertura de slides, caché LRU y generación de teselas |
| `app/inspection.py` | Metadatos técnicos por lista blanca (nunca píxeles ni imágenes asociadas) |
| `app/errors.py` | Errores `application/problem+json` con `urn:gia:problem:*` |
| `app/config.py` | Variables de entorno |

## Decisiones y límites a tener presentes

- **Formato no soportado en DZI o tesela → 415.** El contrato solo define el 415 para `inspect`; se extendió a las demás rutas por coherencia.
- **Imágenes convencionales muy grandes → 415.** Pillow rechaza más de unos 179 millones de píxeles. Una imagen de ese tamaño debe ser una WSI (SVS), que no pasa por Pillow.
- **Concurrencia.** Un slide de OpenSlide se comparte entre pedidos; los de imágenes convencionales (PIL) se leen de a uno por slide.
- **Solo PNG y JPEG están probados con archivos reales.** Falta probar un SVS real (S6 de [pendientes](../docs/arquitectura/07-pendientes.md)).
- **Pendientes:** medir QS-4 con `CMU-1.svs` (I2), comparar la OpenAPI generada con la del contrato en la CI, fijar la etiqueta exacta de la imagen base de Docker y elegir la herramienta de bloqueo de dependencias (ADR-14, `VERIFICAR`).
