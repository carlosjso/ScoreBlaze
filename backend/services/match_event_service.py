from data.entities import MatchEvent
from data.models import MatchEventCreate, MatchEventUpdate
from repositories import MatchEventRepository


class MatchEventService:
    def __init__(self, match_event_repo: MatchEventRepository):
        self.match_event_repo = match_event_repo

    @property
    def db(self):
        return self.match_event_repo.db

    def _validate_relations(self, match_id: int, team_id: int, player_id: int | None) -> None:
        if match_id not in self.match_event_repo.get_existing_match_ids([match_id]):
            raise LookupError("Match not found")
        if team_id not in self.match_event_repo.get_existing_team_ids([team_id]):
            raise LookupError("Team not found")
        if player_id is not None and player_id not in self.match_event_repo.get_existing_player_ids([player_id]):
            raise LookupError("Player not found")

    @staticmethod
    def _normalize_guest_name(guest_name: str | None) -> str | None:
        if guest_name is None:
            return None
        normalized = guest_name.strip()
        return normalized or None

    @classmethod
    def _validate_actor(cls, player_id: int | None, guest_name: str | None) -> str | None:
        normalized_guest_name = cls._normalize_guest_name(guest_name)
        has_player = player_id is not None
        has_guest = normalized_guest_name is not None

        if has_player == has_guest:
            raise ValueError("Provide exactly one actor: player_id or guest_name")

        return normalized_guest_name

    def create(self, data: MatchEventCreate) -> MatchEvent:
        self._validate_relations(data.match_id, data.team_id, data.player_id)
        guest_name = self._validate_actor(data.player_id, data.guest_name)

        match_event = MatchEvent(**data.model_dump())
        match_event.guest_name = guest_name
        self.match_event_repo.add(match_event)
        self.db.commit()
        self.db.refresh(match_event)
        return match_event

    def list(self) -> list[MatchEvent]:
        return self.match_event_repo.list()

    def get(self, event_id: int) -> MatchEvent | None:
        return self.match_event_repo.get(event_id)

    def update(self, event_id: int, data: MatchEventUpdate) -> MatchEvent:
        match_event = self.match_event_repo.get(event_id)
        if not match_event:
            raise LookupError("Match event not found")

        changes = data.model_dump(exclude_unset=True)
        match_id = changes.get("match_id", match_event.match_id)
        team_id = changes.get("team_id", match_event.team_id)
        player_id = changes.get("player_id", match_event.player_id)
        guest_name = changes.get("guest_name", match_event.guest_name)

        self._validate_relations(match_id, team_id, player_id)
        normalized_guest_name = self._validate_actor(player_id, guest_name)

        for key, value in changes.items():
            setattr(match_event, key, value)
        if "guest_name" in changes or "player_id" in changes:
            match_event.guest_name = normalized_guest_name

        self.db.commit()
        self.db.refresh(match_event)
        return match_event

    def delete(self, event_id: int) -> None:
        match_event = self.match_event_repo.get(event_id)
        if not match_event:
            raise LookupError("Match event not found")
        self.match_event_repo.delete(match_event)
        self.db.commit()
