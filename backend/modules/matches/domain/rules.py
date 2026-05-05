from __future__ import annotations

from dataclasses import dataclass
from datetime import time

from core.exceptions import ValidationException


@dataclass(frozen=True)
class MatchResult:
    winner_team_id: int | None
    is_draw: bool


@dataclass(frozen=True)
class MatchScoreState:
    score_team_a: int | None
    score_team_b: int | None
    winner_team_id: int | None
    is_draw: bool


def validate_match_schedule(start_time: time, end_time: time) -> None:
    if start_time >= end_time:
        raise ValidationException("Start time must be earlier than end time")


def validate_match_teams(
    team_a_id: int,
    team_b_id: int,
    winner_team_id: int | None,
) -> None:
    if team_a_id == team_b_id:
        raise ValidationException("Team A and Team B must be different")
    if winner_team_id is not None and winner_team_id not in {team_a_id, team_b_id}:
        raise ValidationException("Winner team must be Team A or Team B")


def resolve_match_result(
    team_a_id: int,
    team_b_id: int,
    score_team_a: int | None,
    score_team_b: int | None,
    winner_team_id: int | None,
    is_draw: bool,
) -> MatchResult:
    if (score_team_a is None) != (score_team_b is None):
        raise ValidationException("Both scores must be provided together")

    if score_team_a is None and score_team_b is None:
        if is_draw and winner_team_id is not None:
            raise ValidationException("Winner team must be empty when draw is true")
        return MatchResult(winner_team_id=winner_team_id, is_draw=is_draw)

    if score_team_a == score_team_b:
        if winner_team_id is not None:
            raise ValidationException("Winner team must be empty when scores are tied")
        return MatchResult(winner_team_id=None, is_draw=True)

    calculated_winner = team_a_id if score_team_a > score_team_b else team_b_id
    if is_draw:
        raise ValidationException("Draw must be false when scores are different")
    if winner_team_id is not None and winner_team_id != calculated_winner:
        raise ValidationException("Winner team does not match the scores")
    return MatchResult(winner_team_id=calculated_winner, is_draw=False)
