from __future__ import annotations

from core.exceptions import ConflictException


def validate_new_membership(already_exists: bool) -> None:
    if already_exists:
        raise ConflictException("Relation already exists")
