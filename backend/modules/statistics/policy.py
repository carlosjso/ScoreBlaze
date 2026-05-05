from core.exceptions import NotFoundException
from modules.statistics.domain import validate_stat_does_not_exist
from modules.statistics.repositories import PlayerStatRepository, TeamStatRepository


class PlayerStatPolicy:
    def __init__(self, player_stat_repo: PlayerStatRepository):
        self.player_stat_repo = player_stat_repo

    def ensure_player_exists(self, player_id: int) -> None:
        if player_id not in self.player_stat_repo.get_existing_player_ids([player_id]):
            raise NotFoundException("Player not found")

    def ensure_player_stat_does_not_exist(self, player_id: int) -> None:
        validate_stat_does_not_exist(
            self.player_stat_repo.get(player_id),
            "Stats for this player already exist",
        )

    def get_existing_player_stat(self, player_id: int):
        player_stat = self.player_stat_repo.get(player_id)
        if not player_stat:
            raise NotFoundException("Player stats not found")
        return player_stat


class TeamStatPolicy:
    def __init__(self, team_stat_repo: TeamStatRepository):
        self.team_stat_repo = team_stat_repo

    def ensure_team_exists(self, team_id: int) -> None:
        if team_id not in self.team_stat_repo.get_existing_team_ids([team_id]):
            raise NotFoundException("Team not found")

    def ensure_team_stat_does_not_exist(self, team_id: int) -> None:
        validate_stat_does_not_exist(
            self.team_stat_repo.get(team_id),
            "Stats for this team already exist",
        )

    def get_existing_team_stat(self, team_id: int):
        team_stat = self.team_stat_repo.get(team_id)
        if not team_stat:
            raise NotFoundException("Team stats not found")
        return team_stat
