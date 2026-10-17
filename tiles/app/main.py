"""Application factory of the tiles service."""

from __future__ import annotations

import json
import logging
import re
import sys
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response

from app.config import Settings
from app.errors import register_error_handlers
from app.routes import health_router, internal_router, tiles_router
from app.slides import SlideRegistry
from app.storage import StorageKeyResolver

REQUEST_ID_HEADER = "X-Request-ID"
# The gateway generates the id; anything else is replaced so logs cannot be polluted.
_VALID_REQUEST_ID = re.compile(r"[A-Za-z0-9._-]{1,64}")

logger = logging.getLogger("tiles.access")


class JsonFormatter(logging.Formatter):
    """One JSON object per line on stdout (architecture 8.7)."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        fields = getattr(record, "fields", None)
        if isinstance(fields, dict):
            payload.update(fields)
        if record.exc_info and record.exc_info[0] is not None:
            payload["exception"] = record.exc_info[0].__name__
        return json.dumps(payload, ensure_ascii=False)


def _configure_logging() -> None:
    root = logging.getLogger("tiles")
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    root.propagate = False


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    _configure_logging()

    app = FastAPI(
        title="GIA · Servicio de teselas",
        version="0.1.0",
        docs_url=None,
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.resolver = StorageKeyResolver(settings.images_root)
    app.state.registry = SlideRegistry(settings.slide_cache_size, settings.jpeg_quality)

    register_error_handlers(app)
    app.include_router(tiles_router)
    app.include_router(internal_router)
    app.include_router(health_router)

    @app.middleware("http")
    async def trace_and_log(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER, "")
        trace_id = incoming if _VALID_REQUEST_ID.fullmatch(incoming) else uuid.uuid4().hex
        request.state.trace_id = trace_id
        started = time.perf_counter()
        response = await call_next(request)
        response.headers[REQUEST_ID_HEADER] = trace_id
        logger.info(
            "request",
            extra={
                "fields": {
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "durationMs": round((time.perf_counter() - started) * 1000, 1),
                    "traceId": trace_id,
                }
            },
        )
        return response

    return app
