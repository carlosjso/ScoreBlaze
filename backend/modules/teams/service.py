from __future__ import annotations

from core.pagination import paginate_sequence
from data.orm import Team
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.players.schemas import PlayerOut
from utils.media import decode_base64_payload

from .policy import TeamPolicy
from .schemas import PaginatedTeamsTableOut, TeamCreate, TeamTablePlayerOut, TeamTableRowOut, TeamUpdate


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

    def list_table(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        sort_key: str,
        sort_dir: str,
    ) -> PaginatedTeamsTableOut:
        teams = self.team_repo.list()
        players_by_id = {player.id: player for player in self.player_repo.list()}
        rows: list[TeamTableRowOut] = []

        for team in teams:
            memberships_by_player_id = {membership.player_id: membership for membership in team.team_memberships}
            player_ids = sorted(memberships_by_player_id)
            team_players = [
                TeamTablePlayerOut(
                    id=player.id,
                    name=player.name,
                    email=player.email,
                    phone="" if player.phone is None else str(player.phone),
                    photo_base64=player.photo_base64,
                    shirt_number=memberships_by_player_id[player_id].shirt_number,
                )
                for player_id in player_ids
                for player in [players_by_id.get(player_id)]
                if player is not None
            ]
            players_label = ", ".join(player.name for player in team_players) if team_players else "Sin jugadores"

            rows.append(
                TeamTableRowOut(
                    id=team.id,
                    name=team.name,
                    responsible_name=team.responsible_name or "",
                    responsible_phone=team.responsible_phone or "",
                    responsible_email=team.responsible_email or "",
                    logo_base64=team.logo_base64,
                    player_ids=player_ids,
                    player_count=len(team_players),
                    players=team_players,
                    players_label=players_label,
                    roster_status="Con jugadores" if team_players else "Sin jugadores",
                )
            )

        normalized_search = search.strip().lower()
        if normalized_search:
            rows = [
                row
                for row in rows
                if normalized_search in str(row.id)
                or normalized_search in row.name.lower()
                or normalized_search in row.players_label.lower()
            ]

        if sort_key == "id":
            rows.sort(key=lambda row: row.id)
        elif sort_key == "players":
            rows.sort(key=lambda row: (row.player_count, row.name.lower(), row.id))
        else:
            rows.sort(key=lambda row: (row.name.lower(), row.id))

        if sort_dir == "desc":
            rows.reverse()

        page_items, normalized_page, normalized_page_size, total_items = paginate_sequence(rows, page, page_size)
        total_pages = max(1, (total_items + normalized_page_size - 1) // normalized_page_size)

        return PaginatedTeamsTableOut(
            items=page_items,
            page=normalized_page,
            page_size=normalized_page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

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
