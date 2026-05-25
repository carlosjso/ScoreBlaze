from __future__ import annotations

from authentication.schemas import AuthUserOut
from core.exceptions import ForbiddenException, NotFoundException
from modules.access_scope import TeamAccessScopeResolver
from data.orm import Match
from database.unit_of_work import UnitOfWork
from modules.matches.domain import MatchResult
from modules.matches.repositories import MatchRepository

from .policy import MatchPolicy
from .schemas import MatchCreate, MatchPatch, MatchUpdate
from .tracked_stats import normalize_match_tracked_stats


class MatchService:
    def __init__(
        self,
        match_repo: MatchRepository,
        scope_resolver: TeamAccessScopeResolver,
        unit_of_work: UnitOfWork,
        policy: MatchPolicy,
    ):
        self.match_repo = match_repo
        self.scope_resolver = scope_resolver
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _build_match(data: MatchCreate, result: MatchResult, tracked_stats: list[str]) -> Match:
        return Match(
            match_date=data.match_date,
            start_time=data.start_time,
            end_time=data.end_time,
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            league_id=data.league_id,
            score_team_a=data.score_team_a,
            score_team_b=data.score_team_b,
            winner_team_id=result.winner_team_id,
            is_draw=result.is_draw,
            court=data.court,
            tournament=data.tournament,
            tracked_stats=tracked_stats,
            status=data.status.value,
        )

    def _resolve_tracked_stats(self, league_id: int | None, tracked_stats: list[str] | None) -> list[str]:
        if league_id is None:
            return normalize_match_tracked_stats(tracked_stats)

        league = self.policy.league_repo.get(league_id)
        if not league:
            raise NotFoundException("Liga no encontrada para este partido.")

        return normalize_match_tracked_stats(list(league.tracked_stats or []))

    def _filter_visible_matches(self, matches: list[Match], current_user: AuthUserOut | None) -> list[Match]:
        if current_user is None:
            return matches

        visible_team_ids = self.scope_resolver.get_visible_team_ids(current_user)
        if visible_team_ids is None:
            return matches

        return [
            match
            for match in matches
            if match.team_a_id in visible_team_ids or match.team_b_id in visible_team_ids
        ]

    def _ensure_match_visible(self, match: Match, current_user: AuthUserOut | None) -> Match:
        if current_user is None:
            return match

        visible_team_ids = self.scope_resolver.get_visible_team_ids(current_user)
        if visible_team_ids is None:
            return match

        if match.team_a_id in visible_team_ids or match.team_b_id in visible_team_ids:
            return match

        raise NotFoundException("Match not found")

    def _ensure_team_scope_access(
        self,
        *,
        team_ids: list[int],
        current_user: AuthUserOut | None,
    ) -> None:
        if current_user is None or not team_ids:
            return

        visible_team_ids = self.scope_resolver.get_visible_team_ids(current_user)
        if visible_team_ids is None:
            return

        if not set(team_ids).intersection(visible_team_ids):
            raise ForbiddenException("El partido debe involucrar al menos uno de tus equipos.")

    def create(self, data: MatchCreate, current_user: AuthUserOut | None = None) -> Match:
        self._ensure_team_scope_access(team_ids=[data.team_a_id, data.team_b_id], current_user=current_user)
        result = self.policy.resolve_create_result(data)
        tracked_stats = self._resolve_tracked_stats(data.league_id, data.tracked_stats)

        match = self._build_match(data, result, tracked_stats)
        with self.unit_of_work.transaction():
            self.match_repo.add(match)
        self.unit_of_work.refresh(match)
        return match

    def list(self, league_id: int | None = None, current_user: AuthUserOut | None = None) -> list[Match]:
        return self._filter_visible_matches(self.match_repo.list(league_id=league_id), current_user)

    def get(self, match_id: int, current_user: AuthUserOut | None = None) -> Match:
        return self._ensure_match_visible(self.policy.get_existing_match(match_id), current_user)

    @staticmethod
    def _update_from_match(match: Match) -> MatchUpdate:
        return MatchUpdate(
            match_date=match.match_date,
            start_time=match.start_time,
            end_time=match.end_time,
            team_a_id=match.team_a_id,
            team_b_id=match.team_b_id,
            league_id=match.league_id,
            score_team_a=match.score_team_a,
            score_team_b=match.score_team_b,
            winner_team_id=match.winner_team_id,
            is_draw=match.is_draw,
            court=match.court,
            tournament=match.tournament,
            tracked_stats=normalize_match_tracked_stats(list(match.tracked_stats or [])),
            status=match.status,
        )

    @staticmethod
    def _merge_patch(match: Match, data: MatchPatch) -> MatchUpdate:
        current = MatchService._update_from_match(match)
        patched = current.model_copy(update=data.model_dump(exclude_unset=True))
        return MatchUpdate.model_validate(patched.model_dump())

    def _apply_update(self, match: Match, data: MatchUpdate) -> Match:
        result = self.policy.resolve_update_result(data)
        tracked_stats = self._resolve_tracked_stats(data.league_id, data.tracked_stats)

        with self.unit_of_work.transaction():
            self.match_repo.update(
                match,
                match_date=data.match_date,
                start_time=data.start_time,
                end_time=data.end_time,
                team_a_id=data.team_a_id,
                team_b_id=data.team_b_id,
                league_id=data.league_id,
                score_team_a=data.score_team_a,
                score_team_b=data.score_team_b,
                winner_team_id=result.winner_team_id,
                is_draw=result.is_draw,
                court=data.court,
                tournament=data.tournament,
                tracked_stats=tracked_stats,
                status=data.status.value,
            )
        self.unit_of_work.refresh(match)
        return match

    def update(self, match_id: int, data: MatchUpdate, current_user: AuthUserOut | None = None) -> Match:
        match = self.get(match_id, current_user)
        self._ensure_team_scope_access(team_ids=[data.team_a_id, data.team_b_id], current_user=current_user)
        return self._apply_update(match, data)

    def patch(self, match_id: int, data: MatchPatch, current_user: AuthUserOut | None = None) -> Match:
        match = self.get(match_id, current_user)
        merged = self._merge_patch(match, data)
        self._ensure_team_scope_access(team_ids=[merged.team_a_id, merged.team_b_id], current_user=current_user)
        return self._apply_update(match, merged)

    def delete(self, match_id: int, current_user: AuthUserOut | None = None) -> None:
        match = self.get(match_id, current_user)
        with self.unit_of_work.transaction():
            self.match_repo.delete(match)
