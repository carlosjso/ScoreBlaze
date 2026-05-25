from __future__ import annotations

import logging
from html import escape

import config
from core.email import EmailMessage, EmailSender
from core.pagination import paginate_sequence
from data.orm import Team, User
from database.unit_of_work import UnitOfWork
from modules.account_invitations.tokens import build_account_invitation_url, create_account_invitation_token
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.players.schemas import PlayerOut
from modules.users.repositories import RoleRepository, UserRepository
from utils.media import decode_base64_payload

from .policy import TeamPolicy
from .schemas import PaginatedTeamsTableOut, TeamCreate, TeamTablePlayerOut, TeamTableRowOut, TeamUpdate

logger = logging.getLogger(__name__)


class TeamService:
    RESPONSIBLE_ROLE_NAME = "coach"

    def __init__(
        self,
        team_repo: TeamRepository,
        player_repo: PlayerRepository,
        membership_repo: MembershipRepository,
        user_repo: UserRepository,
        role_repo: RoleRepository,
        email_sender: EmailSender,
        unit_of_work: UnitOfWork,
        policy: TeamPolicy,
    ):
        self.team_repo = team_repo
        self.player_repo = player_repo
        self.membership_repo = membership_repo
        self.user_repo = user_repo
        self.role_repo = role_repo
        self.email_sender = email_sender
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _decode_logo(logo_base64: str | None) -> bytes | None:
        return decode_base64_payload(logo_base64, "Invalid logo. Could not decode Base64")

    def _ensure_responsible_coach_account(self, data: TeamCreate) -> tuple[User, bool]:
        normalized_email = str(data.responsible_email).strip().lower()
        role = self.role_repo.get_or_create(self.RESPONSIBLE_ROLE_NAME)
        user = self.user_repo.get_by_email(normalized_email, include_deleted=True)

        if user is None:
            user = User(
                name=data.responsible_name.strip(),
                email=normalized_email,
                password_hash=None,
                account_status="pending",
            )
            user.roles = [role]
            self.user_repo.add(user)
            return user, True

        user.deleted_at = None
        should_invite = False
        if not user.password_hash:
            user.account_status = "pending"
            user.name = data.responsible_name.strip()
            should_invite = True

        if role not in user.roles:
            user.roles = [*user.roles, role]

        return user, should_invite

    def _send_responsible_invitation(self, *, user: User, team: Team) -> None:
        token = create_account_invitation_token(
            user_id=user.id,
            email=user.email,
            role=self.RESPONSIBLE_ROLE_NAME,
            team_id=team.id,
        )
        invite_url = build_account_invitation_url(token)
        escaped_name = escape(user.name)
        escaped_team_name = escape(team.name)
        escaped_invite_url = escape(invite_url, quote=True)
        text_body = (
            f"Hola {user.name},\n\n"
            f"Se preparo una cuenta de ScoreBlaze para administrar el equipo {team.name} como coach.\n"
            "Completa la invitacion para validar tu cuenta y crear tu contrasena.\n\n"
            f"{invite_url}\n\n"
            f"Este enlace vence en {config.ACCOUNT_INVITATION_TOKEN_EXPIRES_HOURS} horas.\n"
        )
        html_body = f"""
        <p>Hola {escaped_name},</p>
        <p>Se preparo una cuenta de <strong>ScoreBlaze</strong> para administrar el equipo <strong>{escaped_team_name}</strong> como coach.</p>
        <p>Completa la invitacion para validar tu cuenta y crear tu contrasena.</p>
        <p><a href="{escaped_invite_url}">Completar invitacion</a></p>
        <p>Este enlace vence en {config.ACCOUNT_INVITATION_TOKEN_EXPIRES_HOURS} horas.</p>
        """

        self.email_sender.send(
            EmailMessage(
                to_email=user.email,
                subject=f"Invitacion a ScoreBlaze - {team.name}",
                text_body=text_body,
                html_body=html_body,
            )
        )

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

        responsible_user: User | None = None
        should_invite_responsible = False

        with self.unit_of_work.transaction():
            self.team_repo.add(team)
            responsible_user, should_invite_responsible = self._ensure_responsible_coach_account(data)
            self.unit_of_work.flush()

            if validated_player_ids:
                self.membership_repo.replace_player_ids_for_team(team.id, validated_player_ids)
        self.unit_of_work.refresh(team)

        if responsible_user is not None and should_invite_responsible:
            try:
                self._send_responsible_invitation(user=responsible_user, team=team)
            except Exception:
                logger.exception("Could not send responsible invitation email for team_id=%s", team.id)

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
