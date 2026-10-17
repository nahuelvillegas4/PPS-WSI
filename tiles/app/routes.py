"""HTTP routes of the tiles service (contract: contract/openapi/tiles.v1.yaml).

The handlers are synchronous on purpose: FastAPI runs them in a thread pool, which suits the
blocking OpenSlide calls.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Header, Query, Request, Response
from fastapi import Path as PathParam
from fastapi.responses import JSONResponse

from app.errors import missing_storage_key, not_ready, unsupported_image_format
from app.inspection import inspect_image
from app.slides import SlideRegistry, UnsupportedImageError
from app.storage import StorageKeyResolver

CACHE_CONTROL = "private, max-age=86400"

# Starlette path converters keep the literal parts of the contract paths intact.
ImageId = Annotated[int, PathParam(ge=1)]
Coordinate = Annotated[int, PathParam(ge=0)]

tiles_router = APIRouter(prefix="/tiles/v1", tags=["tiles"])
internal_router = APIRouter(prefix="/internal/v1", tags=["internal"])
health_router = APIRouter(prefix="/health", tags=["ops"])


def _resolve(request: Request, storage_key: str | None) -> Path:
    if storage_key is None:
        raise missing_storage_key()
    resolver: StorageKeyResolver = request.app.state.resolver
    return resolver.resolve(storage_key)


def _registry(request: Request) -> SlideRegistry:
    registry: SlideRegistry = request.app.state.registry
    return registry


@tiles_router.get("/images/{image_id:int}.dzi", operation_id="getDzi")
def get_dzi(
    request: Request,
    image_id: ImageId,
    x_storage_key: Annotated[str | None, Header()] = None,
) -> Response:
    path = _resolve(request, x_storage_key)
    try:
        xml = _registry(request).dzi(path)
    except UnsupportedImageError as exc:
        raise unsupported_image_format() from exc
    return Response(xml, media_type="application/xml", headers={"Cache-Control": CACHE_CONTROL})


@tiles_router.get(
    "/images/{image_id:int}_files/{level:int}/{col:int}_{row:int}.jpeg", operation_id="getTile"
)
def get_tile(
    request: Request,
    image_id: ImageId,
    level: Coordinate,
    col: Coordinate,
    row: Coordinate,
    x_storage_key: Annotated[str | None, Header()] = None,
) -> Response:
    path = _resolve(request, x_storage_key)
    try:
        jpeg = _registry(request).tile_jpeg(path, level, col, row)
    except UnsupportedImageError as exc:
        raise unsupported_image_format() from exc
    return Response(jpeg, media_type="image/jpeg", headers={"Cache-Control": CACHE_CONTROL})


@internal_router.get("/inspect", operation_id="inspectImage")
def inspect(
    request: Request,
    storage_key: Annotated[str, Query(alias="storageKey")],
) -> JSONResponse:
    path = _resolve(request, storage_key)
    try:
        return JSONResponse(inspect_image(path, storage_key))
    except UnsupportedImageError as exc:
        raise unsupported_image_format() from exc


@health_router.get("/live", operation_id="tilesLive")
def live() -> dict[str, str]:
    return {"status": "ok"}


@health_router.get("/ready", operation_id="tilesReady")
def ready(request: Request) -> dict[str, str]:
    resolver: StorageKeyResolver = request.app.state.resolver
    root = resolver.root
    if not root.is_dir() or not os.access(root, os.R_OK | os.X_OK):
        raise not_ready("El volumen de imágenes no está montado o no es legible.")
    return {"status": "ok"}
