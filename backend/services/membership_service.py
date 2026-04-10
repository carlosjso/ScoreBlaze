from data.entities import TeamMembership
from data.models import TeamMembershipCreate, TeamMembershipUpdate
from repositories import MembershipRepository, PlayerRepository, TeamRepository


class TeamMembershipService:
    def __init__(
        self,
        membership_repo: MembershipRepository,
        player_repo: PlayerRepository,
        team_repo: TeamRepository,
    ):
        self.membership_repo = membership_repo
        self.player_repo = player_repo
        self.team_repo = team_repo

    @property
    def db(self):
        return self.membership_repo.db

    def _validate_player_and_team(self, player_id: int, team_id: int) -> None:
        if not self.player_repo.get(player_id):
            raise LookupError("Player not found")
        if not self.team_repo.get(team_id):
            raise LookupError("Team not found")

    def create(self, data: TeamMembershipCreate) -> TeamMembership:
        self._validate_player_and_team(data.player_id, data.team_id)

        existing = self.membership_repo.get(data.player_id, data.team_id)
        if existing:
            raise ValueError("Relation already exists")

        relation = TeamMembership(
            player_id=data.player_id,
            team_id=data.team_id,
            shirt_number=data.shirt_number,
        )
        self.membership_repo.add(relation)
        self.db.commit()
        self.db.refresh(relation)
        return relation

    def list(self) -> list[TeamMembership]:
        return self.membership_repo.list()

    def get(self, player_id: int, team_id: int) -> TeamMembership | None:
        return self.membership_repo.get(player_id, team_id)

    def update(
        self,
        player_id: int,
        team_id: int,
        data: TeamMembershipUpdate,
    ) -> TeamMembership:
        relation = self.membership_repo.get(player_id, team_id)
        if not relation:
            raise LookupError("Relation not found")

        changes = data.model_dump(exclude_unset=True)
        if "shirt_number" in changes:
            relation.shirt_number = changes["shirt_number"]

        self.db.commit()
        self.db.refresh(relation)
        return relation

    def delete(self, player_id: int, team_id: int) -> None:
        relation = self.membership_repo.get(player_id, team_id)
        if not relation:
            raise LookupError("Relation not found")
        self.membership_repo.delete(relation)
        self.db.commit()

    def list_by_team(self, team_id: int) -> list[TeamMembership]:
        if not self.team_repo.get(team_id):
            raise LookupError("Team not found")
        return self.membership_repo.list_by_team(team_id)

    def list_by_player(self, player_id: int) -> list[TeamMembership]:
        if not self.player_repo.get(player_id):
            raise LookupError("Player not found")
        return self.membership_repo.list_by_player(player_id)
