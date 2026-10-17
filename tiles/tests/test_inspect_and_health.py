"""Internal inspection, health checks and request tracing."""

from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.conftest import BROKEN_KEY, JPG_KEY, PNG_KEY


def test_inspect_png_returns_only_whitelisted_technical_fields(
    client: TestClient, images_root: Path
) -> None:
    response = client.get("/internal/v1/inspect", params={"storageKey": PNG_KEY})

    assert response.status_code == 200
    assert response.json() == {
        "storageKey": PNG_KEY,
        "format": "png",
        "kind": "conventional",
        "width": 1376,
        "height": 1020,
        "levelCount": 1,
        "levels": [{"width": 1376, "height": 1020, "downsample": 1.0}],
        "mppX": None,
        "mppY": None,
        "vendor": None,
        "objectivePower": None,
        "associatedImages": [],
        "fileSizeBytes": (images_root / PNG_KEY).stat().st_size,
    }


def test_inspect_jpeg(client: TestClient) -> None:
    body = client.get("/internal/v1/inspect", params={"storageKey": JPG_KEY}).json()

    assert (body["format"], body["kind"], body["width"], body["height"]) == (
        "jpeg",
        "conventional",
        640,
        480,
    )


def test_inspect_error_cases(client: TestClient) -> None:
    cases = {
        "samples/nada.png": (404, "file-not-found"),
        "../fuera.png": (422, "invalid-storage-key"),
        BROKEN_KEY: (415, "unsupported-image-format"),
    }
    for key, (status, slug) in cases.items():
        response = client.get("/internal/v1/inspect", params={"storageKey": key})

        assert response.status_code == status, key
        assert response.json()["type"] == f"urn:gia:problem:{slug}"


def test_inspect_requires_the_storage_key_parameter(client: TestClient) -> None:
    response = client.get("/internal/v1/inspect")

    assert response.status_code == 400
    assert response.json()["type"] == "urn:gia:problem:validation"
    assert "query.storageKey" in response.json()["errors"]


def test_liveness_and_readiness(client: TestClient) -> None:
    assert client.get("/health/live").status_code == 200
    assert client.get("/health/ready").status_code == 200


def test_readiness_fails_when_the_volume_is_not_mounted(tmp_path: Path) -> None:
    missing = tmp_path / "no-montado"
    with TestClient(create_app(Settings(images_root=missing))) as client:
        response = client.get("/health/ready")

        assert response.status_code == 503
        assert response.json()["type"] == "urn:gia:problem:dependency-unavailable"
        assert client.get("/health/live").status_code == 200


def test_the_request_id_from_the_gateway_is_propagated(client: TestClient) -> None:
    response = client.get("/tiles/v1/images/1.dzi", headers={"X-Request-ID": "abc-123"})

    assert response.headers["x-request-id"] == "abc-123"
    assert response.json()["traceId"] == "abc-123"


def test_an_invalid_or_missing_request_id_is_replaced(client: TestClient) -> None:
    for incoming in ({}, {"X-Request-ID": "mal id con espacios"}, {"X-Request-ID": "x" * 200}):
        response = client.get("/health/live", headers=incoming)

        generated = response.headers["x-request-id"]
        assert len(generated) == 32
        assert generated.isalnum()


def test_unknown_routes_use_problem_details(client: TestClient) -> None:
    response = client.get("/no-existe")

    assert response.status_code == 404
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["type"] == "urn:gia:problem:not-found"
