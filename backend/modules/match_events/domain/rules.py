from __future__ import annotations

from core.exceptions import ValidationException


def normalize_guest_name(guest_name: str | None) -> str | None:
    if guest_name is None:
        return None
    normalized = guest_name.strip()
    return normalized or None


def validate_event_actor(player_id: int | None, guest_name: str | None) -> str | None:
    normalized_guest_name = normalize_guest_name(guest_name)
    has_player = player_id is not None
    has_guest = normalized_guest_name is not None

    if has_player == has_guest:
        raise ValidationException("Provide exactly one actor: player_id or guest_name")

    return normalized_guest_name
