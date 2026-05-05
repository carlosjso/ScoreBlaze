from __future__ import annotations

from data.orm import Match
from database.unit_of_work import UnitOfWork
from modules.matches.domain import MatchResult
from modules.matches.repositories import MatchRepository

from .policy import MatchPolicy
from .schemas import MatchCreate, MatchPatch, MatchUpdate


class MatchService:
    def __init__(
        self,
        match_repo: MatchRepository,
        unit_of_work: UnitOfWork,
        policy: MatchPolicy,
    ):
        self.match_repo = match_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _build_match(data: MatchCreate, result: MatchResult) -> Match:
        return Match(
            match_date=data.match_date,
            start_time=data.start_time,
            end_time=data.end_time,
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            score_team_a=data.score_team_a,
            score_team_b=data.score_team_b,
            winner_team_id=result.winner_team_id,
            is_draw=result.is_draw,
            court=data.court,
            tournament=data.tournament,
            status=data.status.value,
        )

    def create(self, data: MatchCreate) -> Match:
        result = self.policy.resolve_create_result(data)

        match = self._build_match(data, result)
        with self.unit_of_work.transaction():
            self.match_repo.add(match)
        self.unit_of_work.refresh(match)
        return match

    def list(self) -> list[Match]:
        return self.match_repo.list()

    def get(self, match_id: int) -> Match:
        return self.policy.get_existing_match(match_id)

    @staticmethod
    def _update_from_match(match: Match) -> MatchUpdate:
        return MatchUpdate(
            match_date=match.match_date,
            start_time=match.start_time,
            end_time=match.end_time,
            team_a_id=match.team_a_id,
            team_b_id=match.team_b_id,
            score_team_a=match.score_team_a,
            score_team_b=match.score_team_b,
            winner_team_id=match.winner_team_id,
            is_draw=match.is_draw,
            court=match.court,
            tournament=match.tournament,
            status=match.status,
        )

    @staticmethod
    def _merge_patch(match: Match, data: MatchPatch) -> MatchUpdate:
        current = MatchService._update_from_match(match)
        patched = current.model_copy(update=data.model_dump(exclude_unset=True))
        return MatchUpdate.model_validate(patched.model_dump())

    def _apply_update(self, match: Match, data: MatchUpdate) -> Match:
        result = self.policy.resolve_update_result(data)

        with self.unit_of_work.transaction():
            self.match_repo.update(
                match,
                match_date=data.match_date,
                start_time=data.start_time,
                end_time=data.end_time,
                team_a_id=data.team_a_id,
                team_b_id=data.team_b_id,
                score_team_a=data.score_team_a,
                score_team_b=data.score_team_b,
                winner_team_id=result.winner_team_id,
                is_draw=result.is_draw,
                court=data.court,
                tournament=data.tournament,
                status=data.status.value,
            )
        self.unit_of_work.refresh(match)
        return match

    def update(self, match_id: int, data: MatchUpdate) -> Match:
        match = self.policy.get_existing_match(match_id)
        return self._apply_update(match, data)

    def patch(self, match_id: int, data: MatchPatch) -> Match:
        match = self.policy.get_existing_match(match_id)
        return self._apply_update(match, self._merge_patch(match, data))

    def delete(self, match_id: int) -> None:
        match = self.policy.get_existing_match(match_id)
        with self.unit_of_work.transaction():
            self.match_repo.delete(match)
