# Servicio de teselas (PPS 1). El wheel de openslide-bin trae la librería nativa: no hace falta apt.
# VERIFICAR: fijar la etiqueta exacta de la imagen base al construir por primera vez (ADR-14).
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    IMAGES_ROOT=/data/images

WORKDIR /srv

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

RUN useradd --system --uid 10001 tiles
USER tiles

EXPOSE 8000

# Los logs los escribe la aplicación (JSON); se desactiva el registro de accesos de uvicorn.
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000", "--no-access-log"]
