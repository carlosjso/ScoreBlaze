from core.exceptions import NotFoundException
from modules.match_events.repositories import MatchEventRepository


class MatchEventPolicy:
    def __init__(self, match_event_repo: MatchEventRepository):
        self.match_event_repo = match_event_repo

    def get_existing_event(self, event_id: int):
        match_event = self.match_event_repo.get(event_id)
        if not match_event:
            raise NotFoundException("Match event not found")
        return match_event

    def ensure_relations_exist(self, match_id: int, team_id: int, player_id: int | None) -> None:
        if match_id not in self.match_event_repo.get_existing_match_ids([match_id]):
            raise NotFoundException("Match not found")
        if team_id not in self.match_event_repo.get_existing_team_ids([team_id]):
            raise NotFoundException("Team not found")
        if player_id is not None and player_id not in self.match_event_repo.get_existing_player_ids([player_id]):
            raise NotFoundException("Player not found")
