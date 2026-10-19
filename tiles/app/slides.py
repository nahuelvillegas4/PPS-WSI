"""Opening slides and generating Deep Zoom content.

`openslide.open_slide()` returns an `OpenSlide` for SVS and an `ImageSlide` for PNG/JPEG, so
both kinds of image follow the same code path (ADR-02).
"""

from __future__ import annotations

import threading
from collections import OrderedDict
from dataclasses import dataclass, field
from io import BytesIO
from pathlib import Path

import openslide
from openslide import ImageSlide, OpenSlide, OpenSlideError
from openslide.deepzoom import DeepZoomGenerator
from PIL import Image

from app.errors import tile_not_found

# Fixed by the contract (tiles.v1.yaml); changing them breaks the numeric cases.
TILE_SIZE = 254
OVERLAP = 1
LIMIT_BOUNDS = False


class UnsupportedImageError(Exception):
    """The file is not a readable SVS, PNG or JPEG."""

    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


def open_slide(path: Path) -> OpenSlide | ImageSlide:
    try:
        return openslide.open_slide(str(path))
    except Image.DecompressionBombError as exc:
        raise UnsupportedImageError(
            "La imagen convencional excede el límite de píxeles; las imágenes de ese tamaño "
            "deben ser WSI (SVS)."
        ) from exc
    except (OpenSlideError, OSError, ValueError) as exc:
        raise UnsupportedImageError("El archivo no es una imagen SVS, PNG o JPEG legible.") from exc


@dataclass
class _Entry:
    slide: OpenSlide | ImageSlide
    generator: DeepZoomGenerator
    users: int = 0
    evicted: bool = False
    # PIL loads lazily and is not safe to share between threads; OpenSlide is.
    read_lock: threading.Lock | None = field(default=None)


_CacheKey = tuple[Path, int, int]


class SlideRegistry:
    """LRU cache of open slides, keyed by file identity (path, mtime, size)."""

    def __init__(self, capacity: int, jpeg_quality: int = 85) -> None:
        self._capacity = max(1, capacity)
        self._jpeg_quality = jpeg_quality
        self._entries: OrderedDict[_CacheKey, _Entry] = OrderedDict()
        self._lock = threading.Lock()

    def __len__(self) -> int:
        with self._lock:
            return len(self._entries)

    def dzi(self, path: Path) -> str:
        entry = self._checkout(path)
        try:
            return str(entry.generator.get_dzi("jpeg"))
        finally:
            self._release(entry)

    def tile_jpeg(self, path: Path, level: int, col: int, row: int) -> bytes:
        entry = self._checkout(path)
        try:
            try:
                if entry.read_lock is not None:
                    with entry.read_lock:
                        tile = entry.generator.get_tile(level, (col, row))
                else:
                    tile = entry.generator.get_tile(level, (col, row))
            except ValueError as exc:  # invalid level or address
                raise tile_not_found() from exc
            buffer = BytesIO()
            tile.convert("RGB").save(buffer, format="JPEG", quality=self._jpeg_quality)
            return buffer.getvalue()
        finally:
            self._release(entry)

    def _checkout(self, path: Path) -> _Entry:
        stat = path.stat()
        key: _CacheKey = (path, stat.st_mtime_ns, stat.st_size)
        with self._lock:
            entry = self._entries.get(key)
            if entry is not None:
                self._entries.move_to_end(key)
                entry.users += 1
                return entry

        # Opening can be slow for large files: do it outside the lock.
        slide = open_slide(path)
        candidate = _Entry(
            slide=slide,
            generator=DeepZoomGenerator(
                slide, tile_size=TILE_SIZE, overlap=OVERLAP, limit_bounds=LIMIT_BOUNDS
            ),
            read_lock=threading.Lock() if isinstance(slide, ImageSlide) else None,
        )
        with self._lock:
            existing = self._entries.get(key)
            if existing is not None:  # another thread opened it first
                self._entries.move_to_end(key)
                existing.users += 1
                slide.close()
                return existing
            candidate.users = 1
            self._entries[key] = candidate
            self._evict_locked()
            return candidate

    def _release(self, entry: _Entry) -> None:
        with self._lock:
            entry.users -= 1
            if entry.evicted and entry.users == 0:
                entry.slide.close()

    def _evict_locked(self) -> None:
        while len(self._entries) > self._capacity:
            _, entry = self._entries.popitem(last=False)
            entry.evicted = True
            if entry.users == 0:
                entry.slide.close()
