from __future__ import annotations

from core.exceptions import ConflictException


def validate_unique_team_name(existing_team_id: int | None, current_team_id: int | None = None) -> None:
    if existing_team_id is not None and existing_team_id != current_team_id:
        raise ConflictException("Team name already exists")
