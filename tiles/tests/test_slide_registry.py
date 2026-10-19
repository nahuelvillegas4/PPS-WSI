"""The slide cache: reuse, bounded size, closing of evicted slides and concurrent reads."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path

import pytest
from openslide import ImageSlide
from PIL import Image

from app import slides
from app.slides import SlideRegistry
from tests.conftest import JPG_KEY, PNG_KEY


@pytest.fixture()
def open_calls(monkeypatch: pytest.MonkeyPatch) -> list[Path]:
    calls: list[Path] = []
    real_open = slides.open_slide

    def counting_open(path: Path) -> object:
        calls.append(path)
        return real_open(path)

    monkeypatch.setattr(slides, "open_slide", counting_open)
    return calls


def test_a_slide_is_opened_once_and_reused(images_root: Path, open_calls: list[Path]) -> None:
    registry = SlideRegistry(capacity=2)
    path = images_root / PNG_KEY

    registry.dzi(path)
    registry.tile_jpeg(path, 11, 0, 0)
    registry.tile_jpeg(path, 11, 1, 0)

    assert len(open_calls) == 1
    assert len(registry) == 1


def test_the_cache_is_bounded_and_closes_evicted_slides(
    images_root: Path, open_calls: list[Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    closed: list[int] = []
    real_close = ImageSlide.close

    def recording_close(self: ImageSlide) -> None:
        closed.append(id(self))
        real_close(self)

    monkeypatch.setattr(ImageSlide, "close", recording_close)
    registry = SlideRegistry(capacity=1)
    first, second = images_root / PNG_KEY, images_root / JPG_KEY

    registry.dzi(first)
    registry.dzi(second)  # evicts the first one

    assert len(registry) == 1
    assert len(closed) == 1
    registry.dzi(first)  # must be reopened
    assert len(open_calls) == 3


def test_a_replaced_file_is_not_served_from_a_stale_slide(
    tmp_path: Path, open_calls: list[Path]
) -> None:
    path = tmp_path / "imagen.png"
    Image.new("RGB", (100, 80)).save(path)
    registry = SlideRegistry(capacity=4)
    assert 'Width="100"' in registry.dzi(path)

    Image.new("RGB", (300, 200)).save(path)

    assert 'Width="300"' in registry.dzi(path)
    assert len(open_calls) == 2


def test_concurrent_reads_of_the_same_slide_return_valid_tiles(images_root: Path) -> None:
    registry = SlideRegistry(capacity=2)
    path = images_root / PNG_KEY

    def read(index: int) -> tuple[int, int]:
        data = registry.tile_jpeg(path, 11, index % 6, index % 5)
        return Image.open(BytesIO(data)).size

    with ThreadPoolExecutor(max_workers=8) as pool:
        sizes = list(pool.map(read, range(48)))

    assert all(width > 0 and height > 0 for width, height in sizes)
