"""RFC 9457 problem responses with `urn:gia:problem:<slug>` types (architecture 8.5, annex A.7)."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

PROBLEM_MEDIA_TYPE = "application/problem+json"
URN_PREFIX = "urn:gia:problem:"

logger = logging.getLogger("tiles.errors")


class ProblemError(Exception):
    """A domain error that is rendered as a problem+json response."""

    def __init__(
        self,
        status: int,
        slug: str,
        title: str,
        detail: str | None = None,
        errors: dict[str, list[str]] | None = None,
    ) -> None:
        super().__init__(title)
        self.status = status
        self.slug = slug
        self.title = title
        self.detail = detail
        self.errors = errors


def missing_storage_key() -> ProblemError:
    return ProblemError(
        400,
        "missing-storage-key",
        "Falta la clave de almacenamiento",
        "La cabecera X-Storage-Key no llegó; indica una pasarela mal configurada.",
    )


def invalid_storage_key(reason: str) -> ProblemError:
    return ProblemError(422, "invalid-storage-key", "Clave de almacenamiento inválida", reason)


def file_not_found() -> ProblemError:
    return ProblemError(404, "file-not-found", "El archivo no existe en el volumen")


def tile_not_found() -> ProblemError:
    return ProblemError(
        404, "tile-not-found", "La tesela no existe", "Nivel o dirección fuera de rango."
    )


def unsupported_image_format() -> ProblemError:
    return ProblemError(
        415,
        "unsupported-image-format",
        "Formato de imagen no soportado",
        "Solo se aceptan SVS, PNG y JPEG.",
    )


def not_ready(reason: str) -> ProblemError:
    return ProblemError(503, "dependency-unavailable", "El servicio no está listo", reason)


def problem_response(
    request: Request,
    status: int,
    slug: str,
    title: str,
    detail: str | None = None,
    errors: dict[str, list[str]] | None = None,
) -> JSONResponse:
    body: dict[str, object] = {"type": URN_PREFIX + slug, "title": title, "status": status}
    if detail:
        body["detail"] = detail
    body["instance"] = request.url.path
    body["traceId"] = getattr(request.state, "trace_id", "")
    if errors:
        body["errors"] = errors
    return JSONResponse(body, status_code=status, media_type=PROBLEM_MEDIA_TYPE)


_HTTP_SLUGS = {404: "not-found", 405: "method-not-allowed"}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ProblemError)
    async def handle_problem(request: Request, exc: ProblemError) -> JSONResponse:
        return problem_response(request, exc.status, exc.slug, exc.title, exc.detail, exc.errors)

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors: dict[str, list[str]] = {}
        for err in exc.errors():
            location = ".".join(str(part) for part in err["loc"])
            errors.setdefault(location, []).append(str(err["msg"]))
        return problem_response(
            request, 400, "validation", "La petición no cumple el contrato", errors=errors
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        slug = _HTTP_SLUGS.get(exc.status_code, "http-error")
        return problem_response(request, exc.status_code, slug, "Petición no válida")

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception) -> JSONResponse:
        # Only the trace id is exposed; the details stay in the logs.
        logger.exception("unhandled error", extra={"fields": {"path": request.url.path}})
        return problem_response(request, 500, "internal", "Error interno")
