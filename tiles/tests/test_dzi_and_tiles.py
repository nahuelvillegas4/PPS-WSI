"""DZI descriptor and tiles, checked against contract/fixtures/dzi.json (case D2)."""

from __future__ import annotations

from io import BytesIO
from typing import Any

from fastapi.testclient import TestClient
from PIL import Image

from tests.conftest import BROKEN_KEY, JPG_KEY, PNG_KEY, key_header

PROBLEM = "application/problem+json"


def test_dzi_matches_contract_case_d2(client: TestClient, dzi_fixture: dict[str, Any]) -> None:
    response = client.get("/tiles/v1/images/1.dzi", headers=key_header(PNG_KEY))

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    assert response.headers["cache-control"] == "private, max-age=86400"
    assert response.text == dzi_fixture["D2"]["dzi"]


def test_tile_has_the_size_and_cache_headers_of_the_contract(
    client: TestClient, dzi_fixture: dict[str, Any]
) -> None:
    case = dzi_fixture["D2"]["tileSizes"][0]
    level, (col, row) = case["level"], case["address"]

    response = client.get(
        f"/tiles/v1/images/1_files/{level}/{col}_{row}.jpeg", headers=key_header(PNG_KEY)
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert response.headers["cache-control"] == "private, max-age=86400"
    tile = Image.open(BytesIO(response.content))
    assert tile.format == "JPEG"
    assert list(tile.size) == case["size"]


def test_level_zero_is_a_single_pixel(client: TestClient) -> None:
    response = client.get("/tiles/v1/images/1_files/0/0_0.jpeg", headers=key_header(PNG_KEY))

    assert response.status_code == 200
    assert Image.open(BytesIO(response.content)).size == (1, 1)


def test_every_tile_of_case_d2_exists_and_nothing_else(
    client: TestClient, dzi_fixture: dict[str, Any]
) -> None:
    case = dzi_fixture["D2"]
    found = 0
    for level in range(case["levelCount"]):
        for col in range(8):
            for row in range(8):
                response = client.get(
                    f"/tiles/v1/images/1_files/{level}/{col}_{row}.jpeg",
                    headers=key_header(PNG_KEY),
                )
                assert response.status_code in (200, 404)
                found += response.status_code == 200
    assert found == case["totalTiles"]


def test_tiles_outside_the_pyramid_are_not_found(client: TestClient) -> None:
    for path in (
        "/tiles/v1/images/1_files/11/6_0.jpeg",  # col out of range
        "/tiles/v1/images/1_files/11/0_5.jpeg",  # row out of range
        "/tiles/v1/images/1_files/12/0_0.jpeg",  # level out of range
    ):
        response = client.get(path, headers=key_header(PNG_KEY))

        assert response.status_code == 404, path
        assert response.headers["content-type"] == PROBLEM
        assert response.json()["type"] == "urn:gia:problem:tile-not-found"


def test_a_jpeg_source_follows_the_same_path_as_a_png(client: TestClient) -> None:
    response = client.get("/tiles/v1/images/2.dzi", headers=key_header(JPG_KEY))

    assert response.status_code == 200
    assert '<Size Width="640" Height="480" />' in response.text


def test_missing_storage_key_is_a_gateway_misconfiguration(client: TestClient) -> None:
    response = client.get("/tiles/v1/images/1.dzi")

    assert response.status_code == 400
    assert response.headers["content-type"] == PROBLEM
    assert response.json()["type"] == "urn:gia:problem:missing-storage-key"
    assert response.json()["traceId"]


def test_unsafe_storage_keys_are_rejected_with_422(client: TestClient) -> None:
    for key in (
        "../secret.png",
        "samples/../samples/prueba.png",
        "/etc/passwd",
        "C:/Windows/win.ini",
        "samples\\prueba.png",
        "samples//prueba.png",
        " samples/prueba.png",
    ):
        response = client.get("/tiles/v1/images/1.dzi", headers=key_header(key))

        assert response.status_code == 422, key
        assert response.json()["type"] == "urn:gia:problem:invalid-storage-key"


def test_a_missing_file_is_404(client: TestClient) -> None:
    response = client.get("/tiles/v1/images/1.dzi", headers=key_header("samples/nada.png"))

    assert response.status_code == 404
    assert response.json()["type"] == "urn:gia:problem:file-not-found"


def test_a_file_that_is_not_an_image_is_415(client: TestClient) -> None:
    response = client.get("/tiles/v1/images/1.dzi", headers=key_header(BROKEN_KEY))

    assert response.status_code == 415
    assert response.json()["type"] == "urn:gia:problem:unsupported-image-format"


def test_the_image_id_must_be_a_positive_integer(client: TestClient) -> None:
    response = client.get("/tiles/v1/images/0.dzi", headers=key_header(PNG_KEY))

    assert response.status_code == 400
    assert response.json()["type"] == "urn:gia:problem:validation"
