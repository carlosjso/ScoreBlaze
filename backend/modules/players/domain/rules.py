from __future__ import annotations

from core.exceptions import ConflictException


def validate_unique_player_email(existing_player_id: int | None, current_player_id: int | None = None) -> None:
    if existing_player_id is not None and existing_player_id != current_player_id:
        raise ConflictException("Ya existe un jugador con ese correo.")
