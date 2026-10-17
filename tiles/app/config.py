"""Service configuration. Environment variables only (architecture 8.8)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    """Runtime settings of the tiles service."""

    images_root: Path
    slide_cache_size: int = 8
    jpeg_quality: int = 85

    @classmethod
    def from_env(cls) -> Settings:
        return cls(
            images_root=Path(os.environ.get("IMAGES_ROOT", "/data/images")),
            slide_cache_size=int(os.environ.get("SLIDE_CACHE_SIZE", "8")),
            jpeg_quality=int(os.environ.get("TILE_JPEG_QUALITY", "85")),
        )
