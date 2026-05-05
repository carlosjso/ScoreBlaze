from __future__ import annotations

from core.exceptions import ConflictException


def validate_stat_does_not_exist(existing_stat: object | None, message: str) -> None:
    if existing_stat is not None:
        raise ConflictException(message)
