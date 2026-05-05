from __future__ import annotations

from data.orm import Player
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.teams.schemas import TeamOut
from utils.media import decode_base64_payload

from .policy import PlayerPolicy
from .schemas import PlayerCreate, PlayerUpdate


class PlayerService:
    def __init__(
        self,
        player_repo: PlayerRepository,
        team_repo: TeamRepository,
        membership_repo: MembershipRepository,
        unit_of_work: UnitOfWork,
        policy: PlayerPolicy,
    ):
        self.player_repo = player_repo
        self.team_repo = team_repo
        self.membership_repo = membership_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _decode_photo(photo_base64: str | None) -> bytes | None:
        return decode_base64_payload(photo_base64, "Invalid photo. Could not decode Base64")

    def create(self, data: PlayerCreate) -> Player:
        self.policy.ensure_email_available(data.email)

        validated_team_ids = self.policy.resolve_team_ids(data.team_ids)
        player = Player(
            name=data.name,
            email=data.email,
            phone=data.phone,
            photo=self._decode_photo(data.photo_base64),
        )

        with self.unit_of_work.transaction():
            self.player_repo.add(player)
            self.unit_of_work.flush()

            if validated_team_ids:
                self.membership_repo.replace_team_ids_for_player(player.id, validated_team_ids)
        self.unit_of_work.refresh(player)
        return player

    def list(self) -> list[Player]:
        return self.player_repo.list()

    def get(self, player_id: int) -> Player:
        return self.policy.get_existing_player(player_id)

    def list_teams(self, player_id: int) -> list[TeamOut]:
        self.get(player_id)
        teams = []
        for relation in self.membership_repo.list_by_player(player_id):
            team = self.team_repo.get(relation.team_id)
            if team:
                teams.append(team)
        return teams

    def update(self, player_id: int, data: PlayerUpdate) -> Player:
        player = self.policy.get_existing_player(player_id)
        self.policy.ensure_email_available(data.email, current_player_id=player_id)

        validated_team_ids = self.policy.resolve_team_ids(data.team_ids)

        with self.unit_of_work.transaction():
            self.membership_repo.replace_team_ids_for_player(player_id, validated_team_ids)
            self.player_repo.update(
                player,
                name=data.name,
                email=data.email,
                phone=data.phone,
                photo=self._decode_photo(data.photo_base64),
            )

        self.unit_of_work.refresh(player)
        return player

    def delete(self, player_id: int) -> None:
        player = self.policy.get_existing_player(player_id)
        with self.unit_of_work.transaction():
            self.player_repo.delete(player)
