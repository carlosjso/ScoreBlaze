from data.orm import MatchEvent
from database.unit_of_work import UnitOfWork
from modules.match_events.domain import validate_event_actor
from modules.match_events.repositories import MatchEventRepository

from .policy import MatchEventPolicy
from .schemas import MatchEventCreate, MatchEventUpdate


class MatchEventService:
    def __init__(
        self,
        match_event_repo: MatchEventRepository,
        unit_of_work: UnitOfWork,
        policy: MatchEventPolicy,
    ):
        self.match_event_repo = match_event_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _build_match_event(data: MatchEventCreate) -> MatchEvent:
        return MatchEvent(
            match_id=data.match_id,
            team_id=data.team_id,
            player_id=data.player_id,
            guest_name=validate_event_actor(data.player_id, data.guest_name),
            event_type=data.event_type.value,
            period=data.period,
            elapsed_seconds=data.elapsed_seconds,
            event_order=data.event_order,
            status=data.status.value,
        )

    def create(self, data: MatchEventCreate) -> MatchEvent:
        self.policy.ensure_relations_exist(data.match_id, data.team_id, data.player_id)

        match_event = self._build_match_event(data)
        with self.unit_of_work.transaction():
            self.match_event_repo.add(match_event)
        self.unit_of_work.refresh(match_event)
        return match_event

    def list(self) -> list[MatchEvent]:
        return self.match_event_repo.list()

    def get(self, event_id: int) -> MatchEvent:
        return self.policy.get_existing_event(event_id)

    def update(self, event_id: int, data: MatchEventUpdate) -> MatchEvent:
        match_event = self.policy.get_existing_event(event_id)
        self.policy.ensure_relations_exist(data.match_id, data.team_id, data.player_id)
        guest_name = validate_event_actor(data.player_id, data.guest_name)

        with self.unit_of_work.transaction():
            self.match_event_repo.update(
                match_event,
                match_id=data.match_id,
                team_id=data.team_id,
                player_id=data.player_id,
                guest_name=guest_name,
                event_type=data.event_type.value,
                period=data.period,
                elapsed_seconds=data.elapsed_seconds,
                event_order=data.event_order,
                status=data.status.value,
            )
        self.unit_of_work.refresh(match_event)
        return match_event

    def delete(self, event_id: int) -> None:
        match_event = self.policy.get_existing_event(event_id)
        with self.unit_of_work.transaction():
            self.match_event_repo.delete(match_event)
