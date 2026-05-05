from core.exceptions import NotFoundException
from modules.memberships.domain import validate_new_membership
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository


class TeamMembershipPolicy:
    def __init__(
        self,
        membership_repo: MembershipRepository,
        player_repo: PlayerRepository,
        team_repo: TeamRepository,
    ):
        self.membership_repo = membership_repo
        self.player_repo = player_repo
        self.team_repo = team_repo

    def ensure_player_exists(self, player_id: int) -> None:
        if not self.player_repo.get(player_id):
            raise NotFoundException("Player not found")

    def ensure_team_exists(self, team_id: int) -> None:
        if not self.team_repo.get(team_id):
            raise NotFoundException("Team not found")

    def ensure_player_and_team_exist(self, player_id: int, team_id: int) -> None:
        self.ensure_player_exists(player_id)
        self.ensure_team_exists(team_id)

    def ensure_new_membership(self, player_id: int, team_id: int) -> None:
        existing = self.membership_repo.get(player_id, team_id)
        validate_new_membership(existing is not None)

    def get_existing_membership(self, player_id: int, team_id: int):
        relation = self.membership_repo.get(player_id, team_id)
        if not relation:
            raise NotFoundException("Relation not found")
        return relation
