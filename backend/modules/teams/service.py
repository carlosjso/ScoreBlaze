from __future__ import annotations

from data.orm import Team
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.players.schemas import PlayerOut
from utils.media import decode_base64_payload

from .policy import TeamPolicy
from .schemas import TeamCreate, TeamUpdate


class TeamService:
    def __init__(
        self,
        team_repo: TeamRepository,
        player_repo: PlayerRepository,
        membership_repo: MembershipRepository,
        unit_of_work: UnitOfWork,
        policy: TeamPolicy,
    ):
        self.team_repo = team_repo
        self.player_repo = player_repo
        self.membership_repo = membership_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _decode_logo(logo_base64: str | None) -> bytes | None:
        return decode_base64_payload(logo_base64, "Invalid logo. Could not decode Base64")

    def create(self, data: TeamCreate) -> Team:
        self.policy.ensure_name_available(data.name)

        validated_player_ids = self.policy.resolve_player_ids(data.player_ids)
        team = Team(
            name=data.name,
            responsible_name=data.responsible_name,
            responsible_phone=data.responsible_phone,
            responsible_email=data.responsible_email,
            logo=self._decode_logo(data.logo_base64),
        )

        with self.unit_of_work.transaction():
            self.team_repo.add(team)
            self.unit_of_work.flush()

            if validated_player_ids:
                self.membership_repo.replace_player_ids_for_team(team.id, validated_player_ids)
        self.unit_of_work.refresh(team)
        return team

    def list(self) -> list[Team]:
        return self.team_repo.list()

    def get(self, team_id: int) -> Team:
        return self.policy.get_existing_team(team_id)

    def list_players(self, team_id: int) -> list[PlayerOut]:
        self.get(team_id)
        players = []
        for relation in self.membership_repo.list_by_team(team_id):
            player = self.player_repo.get(relation.player_id)
            if player:
                players.append(player)
        return players

    def update(self, team_id: int, data: TeamUpdate) -> Team:
        team = self.policy.get_existing_team(team_id)
        self.policy.ensure_name_available(data.name, current_team_id=team_id)

        validated_player_ids = self.policy.resolve_player_ids(data.player_ids)

        with self.unit_of_work.transaction():
            self.membership_repo.replace_player_ids_for_team(team_id, validated_player_ids)
            self.team_repo.update(
                team,
                name=data.name,
                responsible_name=data.responsible_name,
                responsible_phone=data.responsible_phone,
                responsible_email=data.responsible_email,
                logo=self._decode_logo(data.logo_base64),
            )

        self.unit_of_work.refresh(team)
        return team

    def delete(self, team_id: int) -> None:
        team = self.policy.get_existing_team(team_id)
        with self.unit_of_work.transaction():
            self.team_repo.delete(team)
