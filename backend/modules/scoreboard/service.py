from __future__ import annotations

from core.exceptions import ValidationException
from data.orm import MatchEvent
from database.unit_of_work import UnitOfWork
from modules.match_events.domain import MatchEventStatus
from modules.match_events.repositories import MatchEventRepository
from modules.matches.domain import MatchStatus
from modules.matches.repositories import MatchRepository

from .actor_resolver import ScoreboardActorResolver
from .policy import ScoreboardPolicy
from .score_projector import ScoreboardScoreProjector
from .schemas import (
    ScoreboardEventCreate,
    ScoreboardSnapshotOut,
)
from .snapshot_builder import ScoreboardSnapshotBuilder
from .stat_projection_service import ScoreboardStatProjectionService


class ScoreboardService:
    def __init__(
        self,
        match_repo: MatchRepository,
        match_event_repo: MatchEventRepository,
        actor_resolver: ScoreboardActorResolver,
        stat_projection_service: ScoreboardStatProjectionService,
        score_projector: ScoreboardScoreProjector,
        snapshot_builder: ScoreboardSnapshotBuilder,
        unit_of_work: UnitOfWork,
        policy: ScoreboardPolicy,
    ):
        self.match_repo = match_repo
        self.match_event_repo = match_event_repo
        self.actor_resolver = actor_resolver
        self.stat_projection_service = stat_projection_service
        self.score_projector = score_projector
        self.snapshot_builder = snapshot_builder
        self.unit_of_work = unit_of_work
        self.policy = policy

    def get_snapshot(self, match_id: int) -> ScoreboardSnapshotOut:
        match = self.policy.get_existing_match(match_id)
        active_events = self._list_active_events(match_id)
        return self.snapshot_builder.build(match, active_events)

    def record_event(self, match_id: int, data: ScoreboardEventCreate) -> ScoreboardSnapshotOut:
        match = self.policy.get_existing_match(match_id)
        team = self.actor_resolver.resolve_team(match, data.team_key)
        player_id, guest_name = self.actor_resolver.resolve_actor(team.id, data.player_id, data.guest_name)

        event = MatchEvent(
            match_id=match.id,
            team_id=team.id,
            player_id=player_id,
            guest_name=guest_name,
            event_type=data.event_type.value,
            period=data.period,
            elapsed_seconds=data.elapsed_seconds,
            event_order=self._get_next_event_order(match.id),
            status=MatchEventStatus.ACTIVE.value,
        )

        with self.unit_of_work.transaction():
            self.match_event_repo.add(event)
            self.unit_of_work.flush()

            self.stat_projection_service.apply_event(event, direction=1)

            active_events = self._list_active_events(match.id)
            self.match_repo.update_status(match, MatchStatus.LIVE)
            self.match_repo.apply_score_state(match, self.score_projector.project(match, active_events))
        return self.get_snapshot(match.id)

    def undo_last_event(self, match_id: int) -> ScoreboardSnapshotOut:
        match = self.policy.get_existing_match(match_id)
        active_events = self._list_active_events(match.id)

        if not active_events:
            raise ValidationException("No hay eventos activos para deshacer.")

        last_event = active_events[-1]

        with self.unit_of_work.transaction():
            self.match_event_repo.mark_voided(last_event)
            self.stat_projection_service.apply_event(last_event, direction=-1)

            remaining_active_events = active_events[:-1]
            match_status = MatchStatus.LIVE if remaining_active_events else MatchStatus.SCHEDULED
            self.match_repo.update_status(match, match_status)
            self.match_repo.apply_score_state(match, self.score_projector.project(match, remaining_active_events))
        return self.get_snapshot(match.id)

    def reset(self, match_id: int) -> ScoreboardSnapshotOut:
        match = self.policy.get_existing_match(match_id)
        active_events = self._list_active_events(match.id)

        with self.unit_of_work.transaction():
            for event in reversed(active_events):
                self.match_event_repo.mark_voided(event)
                self.stat_projection_service.apply_event(event, direction=-1)

            self.match_repo.update_status(match, MatchStatus.SCHEDULED)
            self.match_repo.apply_score_state(match, self.score_projector.project(match, []))

        return self.get_snapshot(match.id)

    def _get_next_event_order(self, match_id: int) -> int:
        events = self.match_event_repo.list_by_match(match_id)
        if not events:
            return 1
        return events[-1].event_order + 1

    def _list_active_events(self, match_id: int) -> list[MatchEvent]:
        return [
            event
            for event in self.match_event_repo.list_by_match(match_id)
            if event.status == MatchEventStatus.ACTIVE
        ]
