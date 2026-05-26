from __future__ import annotations

import logging
from html import escape

import config
from authentication.schemas import AuthUserOut
from core.exceptions import ForbiddenException, NotFoundException
from core.email import EmailMessage, EmailSender
from core.pagination import paginate_sequence
from data.orm import Team, User
from database.unit_of_work import UnitOfWork
from modules.account_invitations.tokens import build_account_invitation_url, create_account_invitation_token
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.players.schemas import PlayerOut
from modules.users.default_role_permissions import apply_default_permissions_to_role, ensure_catalog_permissions
from modules.users.repositories import PermissionRepository, RoleRepository, UserRepository
from utils.media import decode_base64_payload

from .policy import TeamPolicy
from .schemas import PaginatedTeamsTableOut, TeamCreate, TeamTablePlayerOut, TeamTableRowOut, TeamUpdate

logger = logging.getLogger(__name__)


class TeamService:
    ADMIN_ROLE_NAMES = {"admin", "superadmin"}
    RESPONSIBLE_ROLE_NAME = "coach"
    PLAYER_ROLE_NAME = "jugador"

    def __init__(
        self,
        team_repo: TeamRepository,
        player_repo: PlayerRepository,
        membership_repo: MembershipRepository,
        user_repo: UserRepository,
        role_repo: RoleRepository,
        permission_repo: PermissionRepository,
        email_sender: EmailSender,
        unit_of_work: UnitOfWork,
        policy: TeamPolicy,
    ):
        self.team_repo = team_repo
        self.player_repo = player_repo
        self.membership_repo = membership_repo
        self.user_repo = user_repo
        self.role_repo = role_repo
        self.permission_repo = permission_repo
        self.email_sender = email_sender
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _decode_logo(logo_base64: str | None) -> bytes | None:
        return decode_base64_payload(logo_base64, "Invalid logo. Could not decode Base64")

    @staticmethod
    def _normalize_email(value: str) -> str:
        return value.strip().lower()

    @classmethod
    def _role_names(cls, current_user: AuthUserOut) -> set[str]:
        return {role.strip().lower() for role in current_user.roles}

    @classmethod
    def _has_global_scope(cls, current_user: AuthUserOut) -> bool:
        return not cls.ADMIN_ROLE_NAMES.isdisjoint(cls._role_names(current_user))

    @classmethod
    def _is_coach_scoped_user(cls, current_user: AuthUserOut) -> bool:
        role_names = cls._role_names(current_user)
        return cls.RESPONSIBLE_ROLE_NAME in role_names and cls.ADMIN_ROLE_NAMES.isdisjoint(role_names)

    @classmethod
    def _is_player_scoped_user(cls, current_user: AuthUserOut) -> bool:
        role_names = cls._role_names(current_user)
        return (
            cls.PLAYER_ROLE_NAME in role_names
            and cls.RESPONSIBLE_ROLE_NAME not in role_names
            and cls.ADMIN_ROLE_NAMES.isdisjoint(role_names)
        )

    def _get_visible_team_ids(self, current_user: AuthUserOut) -> set[int] | None:
        if self._has_global_scope(current_user):
            return None

        normalized_email = self._normalize_email(current_user.email)
        if self._is_coach_scoped_user(current_user):
            return {
                team.id
                for team in self.team_repo.list()
                if self._normalize_email(team.responsible_email or "") == normalized_email
            }

        if self._is_player_scoped_user(current_user):
            player = self.player_repo.get_by_email(normalized_email)
            if player is None:
                return set()
            return {membership.team_id for membership in self.membership_repo.list_by_player(player.id)}

        return None

    def _filter_visible_teams(self, teams: list[Team], current_user: AuthUserOut | None) -> list[Team]:
        if current_user is None:
            return teams

        visible_team_ids = self._get_visible_team_ids(current_user)
        if visible_team_ids is None:
            return teams

        return [team for team in teams if team.id in visible_team_ids]

    def _ensure_team_visible(self, team: Team, current_user: AuthUserOut | None) -> Team:
        if current_user is None:
            return team

        visible_team_ids = self._get_visible_team_ids(current_user)
        if visible_team_ids is None or team.id in visible_team_ids:
            return team

        raise NotFoundException("Team not found")

    def _ensure_can_create_team(self, data: TeamCreate, current_user: AuthUserOut | None) -> None:
        if current_user is None or not self._is_coach_scoped_user(current_user):
            return

        if self._normalize_email(str(data.responsible_email)) != self._normalize_email(current_user.email):
            raise ForbiddenException("Solo puedes crear equipos donde tu seas el coach responsable.")

    def _ensure_players_visible(self, player_ids: list[int], current_user: AuthUserOut | None) -> None:
        if current_user is None or not player_ids:
            return

        visible_players = self.player_repo.list()
        if self._has_global_scope(current_user):
            return

        visible_team_ids = self._get_visible_team_ids(current_user) or set()
        normalized_email = self._normalize_email(current_user.email)
        visible_player_ids = {
            player.id
            for player in visible_players
            if self._normalize_email(player.email) == normalized_email
            or any(membership.team_id in visible_team_ids for membership in player.team_memberships)
        }
        missing_player_ids = sorted(set(player_ids) - visible_player_ids)
        if missing_player_ids:
            raise ForbiddenException("No tienes permisos para asignar algunos jugadores a este equipo.")

    def _ensure_responsible_coach_account(self, data: TeamCreate) -> tuple[User, bool]:
        normalized_email = str(data.responsible_email).strip().lower()
        role = self.role_repo.get_or_create(self.RESPONSIBLE_ROLE_NAME)
        apply_default_permissions_to_role(role, ensure_catalog_permissions(self.permission_repo))
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

    def create(self, data: TeamCreate, current_user: AuthUserOut | None = None) -> Team:
        self.policy.ensure_name_available(data.name)
        self._ensure_can_create_team(data, current_user)
        self._ensure_players_visible(data.player_ids, current_user)

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

    def list(self, current_user: AuthUserOut | None = None) -> list[Team]:
        teams = self.team_repo.list()
        return self._filter_visible_teams(teams, current_user)

    def list_table(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        sort_key: str,
        sort_dir: str,
        current_user: AuthUserOut | None = None,
    ) -> PaginatedTeamsTableOut:
        teams = self._filter_visible_teams(self.team_repo.list(), current_user)
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

    def get(self, team_id: int, current_user: AuthUserOut | None = None) -> Team:
        team = self.policy.get_existing_team(team_id)
        return self._ensure_team_visible(team, current_user)

    def list_players(self, team_id: int, current_user: AuthUserOut | None = None) -> list[PlayerOut]:
        self.get(team_id, current_user)
        players = []
        for relation in self.membership_repo.list_by_team(team_id):
            player = self.player_repo.get(relation.player_id)
            if player:
                players.append(player)
        return players

    def update(self, team_id: int, data: TeamUpdate, current_user: AuthUserOut | None = None) -> Team:
        team = self.get(team_id, current_user)
        self.policy.ensure_name_available(data.name, current_team_id=team_id)
        self._ensure_can_create_team(
            TeamCreate(
                name=data.name,
                responsible_name=data.responsible_name,
                responsible_phone=data.responsible_phone,
                responsible_email=data.responsible_email,
                logo_base64=data.logo_base64,
                player_ids=data.player_ids,
            ),
            current_user,
        )
        self._ensure_players_visible(data.player_ids, current_user)

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

    def delete(self, team_id: int, current_user: AuthUserOut | None = None) -> None:
        team = self.get(team_id, current_user)
        with self.unit_of_work.transaction():
            self.team_repo.delete(team)
