from __future__ import annotations

from core.exceptions import ValidationException
from data.orm import MatchEvent, MatchPlayerParticipation
from database.unit_of_work import UnitOfWork
from modules.match_events.domain import MatchEventStatus
from modules.matches.tracked_stats import does_track_stat, get_tracked_stat_for_event
from modules.match_events.repositories import MatchEventRepository
from modules.match_participations.repositories import MatchPlayerParticipationRepository
from modules.matches.domain import MatchStatus
from modules.matches.repositories import MatchRepository

from .actor_resolver import ScoreboardActorResolver
from .policy import ScoreboardPolicy
from .score_projector import ScoreboardScoreProjector
from .schemas import (
    ScoreboardEventCreate,
    ScoreboardPlayerParticipationUpdate,
    ScoreboardSnapshotOut,
)
from .snapshot_builder import ScoreboardSnapshotBuilder
from .stat_projection_service import ScoreboardStatProjectionService


class ScoreboardService:
    def __init__(
        self,
        match_repo: MatchRepository,
        match_event_repo: MatchEventRepository,
        match_participation_repo: MatchPlayerParticipationRepository,
        actor_resolver: ScoreboardActorResolver,
        stat_projection_service: ScoreboardStatProjectionService,
        score_projector: ScoreboardScoreProjector,
        snapshot_builder: ScoreboardSnapshotBuilder,
        unit_of_work: UnitOfWork,
        policy: ScoreboardPolicy,
    ):
        self.match_repo = match_repo
        self.match_event_repo = match_event_repo
        self.match_participation_repo = match_participation_repo
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
        tracked_stat = get_tracked_stat_for_event(data.event_type)
        if tracked_stat is not None and not does_track_stat(tracked_stat, getattr(match, "tracked_stats", None)):
            raise ValidationException(f"La metrica {tracked_stat} no esta habilitada para este partido.")
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
            if player_id is not None:
                self._upsert_player_participation(
                    match_id=match.id,
                    team_id=team.id,
                    player_id=player_id,
                    present=True,
                    played=True,
                )

            self.stat_projection_service.apply_event(event, direction=1)

            active_events = self._list_active_events(match.id)
            self.match_repo.update_status(match, MatchStatus.LIVE)
            self.match_repo.apply_score_state(match, self.score_projector.project(match, active_events))
        return self.get_snapshot(match.id)

    def update_player_participation(
        self,
        match_id: int,
        player_id: int,
        data: ScoreboardPlayerParticipationUpdate,
    ) -> ScoreboardSnapshotOut:
        if data.is_present is None and data.did_play is None:
            raise ValidationException("Debes indicar al menos un cambio de asistencia o participacion.")

        match = self.policy.get_existing_match(match_id)
        team = self.actor_resolver.resolve_team(match, data.team_key)
        resolved_player_id, _ = self.actor_resolver.resolve_actor(team.id, player_id, None)

        next_present = data.is_present
        next_played = data.did_play

        if next_present is False:
            next_played = False
        elif next_played is True:
            next_present = True if next_present is None else next_present

        with self.unit_of_work.transaction():
            self._upsert_player_participation(
                match_id=match.id,
                team_id=team.id,
                player_id=resolved_player_id,
                present=next_present,
                played=next_played,
            )

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

            for participation in self.match_participation_repo.list_by_match(match.id):
                self.match_participation_repo.update(participation, played=False)

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

    def _upsert_player_participation(
        self,
        *,
        match_id: int,
        team_id: int,
        player_id: int,
        present: bool | None = None,
        played: bool | None = None,
    ) -> MatchPlayerParticipation:
        participation = self.match_participation_repo.get(match_id, team_id, player_id)
        if participation is None:
            participation = MatchPlayerParticipation(
                match_id=match_id,
                team_id=team_id,
                player_id=player_id,
                present=False,
                played=False,
            )
            self.match_participation_repo.add(participation)
            self.unit_of_work.flush()

        next_present = participation.present if present is None else present
        next_played = participation.played if played is None else played

        if next_played:
            next_present = True
        if not next_present:
            next_played = False

        return self.match_participation_repo.update(
            participation,
            present=next_present,
            played=next_played,
        )
