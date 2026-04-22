from __future__ import annotations

from datetime import time

from data.entities import Match
from data.models import MatchCreate, MatchUpdate
from repositories import MatchRepository


class MatchService:
    def __init__(self, match_repo: MatchRepository):
        self.match_repo = match_repo

    @property
    def db(self):
        return self.match_repo.db

    @staticmethod
    def _validate_schedule(start_time: time, end_time: time) -> None:
        if start_time >= end_time:
            raise ValueError("Start time must be earlier than end time")

    def _validate_teams(self, team_a_id: int, team_b_id: int, winner_team_id: int | None) -> None:
        if team_a_id == team_b_id:
            raise ValueError("Team A and Team B must be different")

        ids_to_check = {team_a_id, team_b_id}
        if winner_team_id is not None:
            ids_to_check.add(winner_team_id)

        existing = self.match_repo.get_existing_team_ids(list(ids_to_check))
        missing = sorted(ids_to_check - existing)
        if missing:
            raise LookupError(f"Teams not found: {missing}")

        if winner_team_id is not None and winner_team_id not in {team_a_id, team_b_id}:
            raise ValueError("Winner team must be Team A or Team B")

    @staticmethod
    def _resolve_result(
        team_a_id: int,
        team_b_id: int,
        score_team_a: int | None,
        score_team_b: int | None,
        winner_team_id: int | None,
        is_draw: bool,
    ) -> tuple[int | None, bool]:
        if (score_team_a is None) != (score_team_b is None):
            raise ValueError("Both scores must be provided together")

        if score_team_a is None and score_team_b is None:
            if is_draw and winner_team_id is not None:
                raise ValueError("Winner team must be empty when draw is true")
            return winner_team_id, is_draw

        if score_team_a == score_team_b:
            if winner_team_id is not None:
                raise ValueError("Winner team must be empty when scores are tied")
            return None, True

        calculated_winner = team_a_id if score_team_a > score_team_b else team_b_id
        if is_draw:
            raise ValueError("Draw must be false when scores are different")
        if winner_team_id is not None and winner_team_id != calculated_winner:
            raise ValueError("Winner team does not match the scores")
        return calculated_winner, False

    def create(self, data: MatchCreate) -> Match:
        self._validate_schedule(data.start_time, data.end_time)
        self._validate_teams(data.team_a_id, data.team_b_id, data.winner_team_id)

        winner_team_id, is_draw = self._resolve_result(
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            score_team_a=data.score_team_a,
            score_team_b=data.score_team_b,
            winner_team_id=data.winner_team_id,
            is_draw=data.is_draw,
        )

        match = Match(
            match_date=data.match_date,
            start_time=data.start_time,
            end_time=data.end_time,
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            score_team_a=data.score_team_a,
            score_team_b=data.score_team_b,
            winner_team_id=winner_team_id,
            is_draw=is_draw,
            court=data.court,
            tournament=data.tournament,
            status=data.status,
        )

        self.match_repo.add(match)
        self.db.commit()
        self.db.refresh(match)
        return match

    def list(self) -> list[Match]:
        return self.match_repo.list()

    def get(self, match_id: int) -> Match | None:
        return self.match_repo.get(match_id)

    def update(self, match_id: int, data: MatchUpdate) -> Match:
        match = self.match_repo.get(match_id)
        if not match:
            raise LookupError("Match not found")

        changes = data.model_dump(exclude_unset=True)

        team_a_id = changes.get("team_a_id", match.team_a_id)
        team_b_id = changes.get("team_b_id", match.team_b_id)
        start_time = changes.get("start_time", match.start_time)
        end_time = changes.get("end_time", match.end_time)
        score_team_a = changes.get("score_team_a", match.score_team_a)
        score_team_b = changes.get("score_team_b", match.score_team_b)
        winner_team_id = changes.get("winner_team_id", match.winner_team_id)
        is_draw = changes.get("is_draw", match.is_draw)

        self._validate_schedule(start_time, end_time)
        self._validate_teams(team_a_id, team_b_id, winner_team_id)

        winner_team_id, is_draw = self._resolve_result(
            team_a_id=team_a_id,
            team_b_id=team_b_id,
            score_team_a=score_team_a,
            score_team_b=score_team_b,
            winner_team_id=winner_team_id,
            is_draw=is_draw,
        )

        for key, value in changes.items():
            setattr(match, key, value)
        match.winner_team_id = winner_team_id
        match.is_draw = is_draw

        self.db.commit()
        self.db.refresh(match)
        return match

    def delete(self, match_id: int) -> None:
        match = self.match_repo.get(match_id)
        if not match:
            raise LookupError("Match not found")
        self.match_repo.delete(match)
        self.db.commit()
