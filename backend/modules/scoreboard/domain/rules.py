from __future__ import annotations

from core.exceptions import ValidationException
from modules.match_events.domain import MatchEventType


class BasketballScoreboardRules:
    POINTS_BY_EVENT_TYPE = {
        MatchEventType.POINT_1: 1,
        MatchEventType.POINT_2: 2,
        MatchEventType.POINT_3: 3,
    }

    def points_for_event(self, event_type: MatchEventType | str) -> int:
        try:
            normalized_event_type = MatchEventType(event_type)
        except ValueError:
            return 0

        return self.POINTS_BY_EVENT_TYPE.get(normalized_event_type, 0)

    @staticmethod
    def normalize_guest_name(guest_name: str | None) -> str | None:
        if guest_name is None:
            return None
        normalized = guest_name.strip()
        return normalized or None

    def validate_actor(
        self,
        player_id: int | None,
        guest_name: str | None,
    ) -> tuple[int | None, str | None]:
        normalized_guest_name = self.normalize_guest_name(guest_name)
        has_player = player_id is not None
        has_guest = normalized_guest_name is not None

        if has_player == has_guest:
            raise ValidationException("Debes enviar exactamente un actor: player_id o guest_name.")

        if has_player:
            return player_id, None
        return None, normalized_guest_name

    @staticmethod
    def increment_non_negative(current: int, delta: int) -> int:
        return max(0, current + delta)
