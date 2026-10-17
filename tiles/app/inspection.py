"""Technical metadata of an image file, restricted to a whitelist (ADR-12).

Never returns pixels or associated images (label, macro): only their names, so the
administrator can be warned.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from openslide import ImageSlide
from PIL import Image

from app.slides import UnsupportedImageError, open_slide


def _as_float(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def inspect_image(path: Path, storage_key: str) -> dict[str, Any]:
    slide = open_slide(path)
    try:
        properties = slide.properties
        if isinstance(slide, ImageSlide):
            with Image.open(path) as image:  # header only; ImageSlide hides the format
                image_format = {"PNG": "png", "JPEG": "jpeg"}.get(str(image.format).upper())
            kind = "conventional"
        else:
            image_format = "svs" if properties.get("openslide.vendor") == "aperio" else None
            kind = "wsi"
        if image_format is None:
            raise UnsupportedImageError("Solo se aceptan SVS, PNG y JPEG.")

        width, height = slide.dimensions
        return {
            "storageKey": storage_key,
            "format": image_format,
            "kind": kind,
            "width": width,
            "height": height,
            "levelCount": slide.level_count,
            "levels": [
                {"width": level_width, "height": level_height, "downsample": float(downsample)}
                for (level_width, level_height), downsample in zip(
                    slide.level_dimensions, slide.level_downsamples, strict=True
                )
            ],
            "mppX": _as_float(properties.get("openslide.mpp-x")),
            "mppY": _as_float(properties.get("openslide.mpp-y")),
            "vendor": properties.get("openslide.vendor"),
            "objectivePower": _as_float(properties.get("openslide.objective-power")),
            "associatedImages": sorted(slide.associated_images.keys()),
            "fileSizeBytes": path.stat().st_size,
        }
    finally:
        slide.close()
