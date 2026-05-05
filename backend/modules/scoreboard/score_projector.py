from __future__ import annotations

from typing import TYPE_CHECKING

from modules.matches.domain import MatchScoreState
from modules.scoreboard.domain import BasketballScoreboardRules

if TYPE_CHECKING:
    from data.orm import MatchEvent


class ScoreboardScoreProjector:
    def __init__(self, rules: BasketballScoreboardRules):
        self.rules = rules

    def project(self, match, active_events: list[MatchEvent]) -> MatchScoreState:
        score_a = 0
        score_b = 0
        has_points = False

        for event in active_events:
            points = self.rules.points_for_event(event.event_type)
            if not points:
                continue

            has_points = True
            if event.team_id == match.team_a_id:
                score_a += points
            elif event.team_id == match.team_b_id:
                score_b += points

        if not has_points:
            return MatchScoreState(
                score_team_a=None,
                score_team_b=None,
                winner_team_id=None,
                is_draw=False,
            )

        return MatchScoreState(
            score_team_a=score_a,
            score_team_b=score_b,
            winner_team_id=None if score_a == score_b else match.team_a_id if score_a > score_b else match.team_b_id,
            is_draw=False,
        )
