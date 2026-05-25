from collections.abc import Iterator

from .domain import MatchEventType


class EventBuilder:
    @staticmethod
    def build_player_events(player_data: dict) -> list[tuple[str, int]]:
        """
        Convierte stats del jugador en lista de (event_type, cantidad)
        """

        return [
            (MatchEventType.POINT_1.value, player_data.get("t1", 0)),
            (MatchEventType.POINT_2.value, player_data.get("t2", 0)),
            (MatchEventType.POINT_3.value, player_data.get("t3", 0)),

            (MatchEventType.ASSIST.value, player_data.get("assists", 0)),
            (MatchEventType.REBOUND.value, player_data.get("rebounds", 0)),
            (MatchEventType.FOUL.value, player_data.get("fouls", 0)),
            (MatchEventType.STEAL.value, player_data.get("steals", 0)),
            (MatchEventType.BLOCK.value, player_data.get("blocks", 0)),
        ]

    @staticmethod
    def calculate_misses(player_data: dict) -> int:
        made_shots = (
            player_data.get("t1", 0)
            + player_data.get("t2", 0)
            + player_data.get("t3", 0)
        )

        return max(player_data.get("attempts", 0) - made_shots, 0)