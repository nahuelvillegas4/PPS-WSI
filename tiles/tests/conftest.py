from __future__ import annotations

import json
from collections.abc import Iterator
from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.config import Settings
from app.main import create_app

REPO_ROOT = Path(__file__).resolve().parents[2]
PNG_KEY = "samples/prueba.png"
JPG_KEY = "samples/foto.jpg"
BROKEN_KEY = "samples/no-es-imagen.png"


def _draw_test_image(width: int, height: int) -> Image.Image:
    """An asymmetric picture, so a flipped or shifted tile is visible."""
    image = Image.new("RGB", (width, height), (235, 235, 235))
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 0, 200, 120), fill=(200, 40, 40))
    draw.rectangle((width - 120, height - 80, width, height), fill=(40, 40, 200))
    draw.line((0, 0, width, height), fill=(20, 20, 20), width=4)
    return image


@pytest.fixture(scope="session")
def images_root(tmp_path_factory: pytest.TempPathFactory) -> Path:
    root = tmp_path_factory.mktemp("images")
    (root / "samples").mkdir()
    _draw_test_image(1376, 1020).save(root / PNG_KEY)
    _draw_test_image(640, 480).save(root / JPG_KEY, format="JPEG")
    (root / BROKEN_KEY).write_bytes(b"this is not an image")
    return root


@pytest.fixture()
def settings(images_root: Path) -> Settings:
    return Settings(images_root=images_root, slide_cache_size=2, jpeg_quality=85)


@pytest.fixture()
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def dzi_fixture() -> dict[str, Any]:
    data = json.loads(
        (REPO_ROOT / "contract" / "fixtures" / "dzi.json").read_text(encoding="utf-8")
    )
    return {case["id"]: case for case in data["cases"]}


def key_header(key: str) -> dict[str, str]:
    return {"X-Storage-Key": key}
