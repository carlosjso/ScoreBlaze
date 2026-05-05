from __future__ import annotations

from core.exceptions import ConflictException


def validate_unique_user_email(existing_user_id: int | None, current_user_id: int | None = None) -> None:
    if existing_user_id is not None and existing_user_id != current_user_id:
        raise ConflictException("Email already exists")
