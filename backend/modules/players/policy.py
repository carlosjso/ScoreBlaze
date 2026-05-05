from core.exceptions import NotFoundException
from modules.players.domain import validate_unique_player_email
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository


class PlayerPolicy:
    def __init__(self, player_repo: PlayerRepository, team_repo: TeamRepository):
        self.player_repo = player_repo
        self.team_repo = team_repo

    def get_existing_player(self, player_id: int):
        player = self.player_repo.get(player_id)
        if not player:
            raise NotFoundException("Player not found")
        return player

    def ensure_email_available(self, email: str, current_player_id: int | None = None) -> None:
        existing_player = self.player_repo.get_by_email(email)
        validate_unique_player_email(
            existing_player.id if existing_player else None,
            current_player_id=current_player_id,
        )

    def resolve_team_ids(self, team_ids: list[int]) -> list[int]:
        unique_ids = sorted(set(team_ids))
        if not unique_ids:
            return []

        found = self.team_repo.get_many_by_ids(unique_ids)
        found_ids = {team.id for team in found}
        missing_ids = [team_id for team_id in unique_ids if team_id not in found_ids]
        if missing_ids:
            raise NotFoundException(f"Teams not found: {missing_ids}")
        return unique_ids
