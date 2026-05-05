from core.exceptions import NotFoundException
from modules.players.repositories import PlayerRepository
from modules.teams.domain import validate_unique_team_name
from modules.teams.repositories import TeamRepository


class TeamPolicy:
    def __init__(self, team_repo: TeamRepository, player_repo: PlayerRepository):
        self.team_repo = team_repo
        self.player_repo = player_repo

    def get_existing_team(self, team_id: int):
        team = self.team_repo.get(team_id)
        if not team:
            raise NotFoundException("Team not found")
        return team

    def ensure_name_available(self, name: str, current_team_id: int | None = None) -> None:
        existing_team = self.team_repo.get_by_name(name)
        validate_unique_team_name(
            existing_team.id if existing_team else None,
            current_team_id=current_team_id,
        )

    def resolve_player_ids(self, player_ids: list[int]) -> list[int]:
        unique_ids = sorted(set(player_ids))
        if not unique_ids:
            return []

        found = self.player_repo.get_many_by_ids(unique_ids)
        found_ids = {player.id for player in found}
        missing_ids = [player_id for player_id in unique_ids if player_id not in found_ids]
        if missing_ids:
            raise NotFoundException(f"Players not found: {missing_ids}")
        return unique_ids
