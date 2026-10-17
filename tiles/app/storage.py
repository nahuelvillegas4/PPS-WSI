"""Storage keys: relative paths inside the images volume (ADR-03)."""

from __future__ import annotations

import re
from pathlib import Path

from app.errors import file_not_found, invalid_storage_key

_MAX_KEY_LENGTH = 1024
_DRIVE_PREFIX = re.compile(r"^[A-Za-z]:")


class StorageKeyResolver:
    """Turns a storage key into a file inside the volume, or refuses it."""

    def __init__(self, root: Path) -> None:
        self._root = root.resolve()

    @property
    def root(self) -> Path:
        return self._root

    def resolve(self, key: str) -> Path:
        """Return the absolute path of an existing file for `key`.

        Raises 422 for keys that are absolute, contain `..` or leave the volume, and
        404 when the file does not exist.
        """
        self._validate(key)
        candidate = (self._root / key).resolve()
        if not candidate.is_relative_to(self._root):
            raise invalid_storage_key("La clave resuelve fuera del volumen de imágenes.")
        if not candidate.is_file():
            raise file_not_found()
        return candidate

    @staticmethod
    def _validate(key: str) -> None:
        if not key or key != key.strip():
            raise invalid_storage_key("La clave está vacía o tiene espacios en los extremos.")
        if len(key) > _MAX_KEY_LENGTH:
            raise invalid_storage_key("La clave es demasiado larga.")
        if "\\" in key or "\x00" in key:
            raise invalid_storage_key(
                "La clave usa «/» como separador y no admite caracteres de control."
            )
        if key.startswith("/") or _DRIVE_PREFIX.match(key):
            raise invalid_storage_key("La clave debe ser relativa a la carpeta de imágenes.")
        if any(part in {"", ".", ".."} for part in key.split("/")):
            raise invalid_storage_key("La clave no admite segmentos vacíos, «.» ni «..».")
