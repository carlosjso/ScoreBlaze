from __future__ import annotations

from core.pagination import paginate_sequence
from data.orm import Player
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.teams.schemas import TeamOut
from utils.media import decode_base64_payload

from .policy import PlayerPolicy
from .schemas import (
    PaginatedPlayersTableOut,
    PlayerCreate,
    PlayerTableRowOut,
    PlayerTableTeamOut,
    PlayerUpdate,
)


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
            age=data.age,
            height_cm=data.height_cm,
            weight_kg=data.weight_kg,
            nationality=data.nationality,
            favorite_position=data.favorite_position,
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

    def list_table(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        team_filter: str,
        sort_key: str,
        sort_dir: str,
    ) -> PaginatedPlayersTableOut:
        players = self.player_repo.list()
        teams_by_id = {team.id: team for team in self.team_repo.list()}
        rows: list[PlayerTableRowOut] = []

        for player in players:
            team_ids = sorted({membership.team_id for membership in player.team_memberships})
            player_teams = [
                PlayerTableTeamOut(
                    id=team.id,
                    name=team.name,
                    logo_base64=team.logo_base64,
                )
                for team_id in team_ids
                for team in [teams_by_id.get(team_id)]
                if team is not None
            ]
            team_names = [team.name for team in player_teams]

            rows.append(
                PlayerTableRowOut(
                    id=player.id,
                    name=player.name,
                    email=player.email,
                    phone="" if player.phone is None else str(player.phone),
                    age=player.age,
                    height_cm=player.height_cm,
                    weight_kg=player.weight_kg,
                    nationality=player.nationality,
                    favorite_position=player.favorite_position,
                    photo_base64=player.photo_base64,
                    team_ids=team_ids,
                    team_names=team_names,
                    teams=player_teams,
                    team_label=", ".join(team_names) if team_names else "Sin equipo",
                    teams_count=len(team_names),
                    status="Con equipo" if team_names else "Sin equipo",
                )
            )

        if team_filter == "none":
            rows = [row for row in rows if len(row.team_ids) == 0]
        elif team_filter != "all":
            team_id = int(team_filter)
            rows = [row for row in rows if team_id in row.team_ids]

        normalized_search = search.strip().lower()
        if normalized_search:
            rows = [
                row
                for row in rows
                if normalized_search in str(row.id)
                or normalized_search in row.name.lower()
                or normalized_search in row.email.lower()
                or normalized_search in row.phone.lower()
                or normalized_search in row.status.lower()
                or normalized_search in row.team_label.lower()
            ]

        if sort_key == "name":
            rows.sort(key=lambda row: (row.name.lower(), row.id))
        else:
            rows.sort(key=lambda row: row.id)

        if sort_dir == "desc":
            rows.reverse()

        page_items, normalized_page, normalized_page_size, total_items = paginate_sequence(rows, page, page_size)
        total_pages = max(1, (total_items + normalized_page_size - 1) // normalized_page_size)

        return PaginatedPlayersTableOut(
            items=page_items,
            page=normalized_page,
            page_size=normalized_page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

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
                age=data.age,
                height_cm=data.height_cm,
                weight_kg=data.weight_kg,
                nationality=data.nationality,
                favorite_position=data.favorite_position,
                photo=self._decode_photo(data.photo_base64),
            )

        self.unit_of_work.refresh(player)
        return player

    def delete(self, player_id: int) -> None:
        player = self.policy.get_existing_player(player_id)
        with self.unit_of_work.transaction():
            self.player_repo.delete(player)
