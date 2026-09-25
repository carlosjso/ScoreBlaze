from __future__ import annotations

import logging
from html import escape

import config
from authentication.schemas import AuthUserOut
from core.exceptions import ForbiddenException, NotFoundException
from core.email import EmailMessage, EmailSender
from core.pagination import paginate_sequence
from data.orm import Player, User
from database.unit_of_work import UnitOfWork
from modules.account_invitations.tokens import build_account_invitation_url, create_account_invitation_token
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.teams.schemas import TeamOut
from modules.users.default_role_permissions import apply_default_permissions_to_role, ensure_catalog_permissions
from modules.users.repositories import PermissionRepository, RoleRepository, UserRepository
from utils.media import decode_base64_payload

from .policy import PlayerPolicy
from .schemas import (
    PaginatedPlayersTableOut,
    PlayerCreate,
    PlayerTableRowOut,
    PlayerTableTeamOut,
    PlayerUpdate,
)

logger = logging.getLogger(__name__)


class PlayerService:
    ADMIN_ROLE_NAMES = {"admin", "superadmin"}
    COACH_ROLE_NAME = "coach"
    PLAYER_ROLE_NAME = "jugador"

    def __init__(
        self,
        player_repo: PlayerRepository,
        team_repo: TeamRepository,
        membership_repo: MembershipRepository,
        user_repo: UserRepository,
        role_repo: RoleRepository,
        permission_repo: PermissionRepository,
        email_sender: EmailSender,
        unit_of_work: UnitOfWork,
        policy: PlayerPolicy,
    ):
        self.player_repo = player_repo
        self.team_repo = team_repo
        self.membership_repo = membership_repo
        self.user_repo = user_repo
        self.role_repo = role_repo
        self.permission_repo = permission_repo
        self.email_sender = email_sender
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _decode_photo(photo_base64: str | None) -> bytes | None:
        return decode_base64_payload(photo_base64, "Invalid photo. Could not decode Base64")

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
        return cls.COACH_ROLE_NAME in role_names and cls.ADMIN_ROLE_NAMES.isdisjoint(role_names)

    @classmethod
    def _is_player_scoped_user(cls, current_user: AuthUserOut) -> bool:
        role_names = cls._role_names(current_user)
        return (
            cls.PLAYER_ROLE_NAME in role_names
            and cls.COACH_ROLE_NAME not in role_names
            and cls.ADMIN_ROLE_NAMES.isdisjoint(role_names)
        )

    def _get_visible_team_ids(self, current_user: AuthUserOut) -> set[int] | None:
        if self._has_global_scope(current_user):
            return None

        if self._is_coach_scoped_user(current_user):
            normalized_email = self._normalize_email(current_user.email)
            return {
                team.id
                for team in self.team_repo.list()
                if self._normalize_email(team.responsible_email or "") == normalized_email
            }

        return None

    def _filter_visible_players(self, players: list[Player], current_user: AuthUserOut | None) -> list[Player]:
        if current_user is None or self._has_global_scope(current_user):
            return players

        normalized_email = self._normalize_email(current_user.email)
        if self._is_player_scoped_user(current_user):
            return [player for player in players if self._normalize_email(player.email) == normalized_email]

        if self._is_coach_scoped_user(current_user):
            visible_team_ids = self._get_visible_team_ids(current_user) or set()
            return [
                player
                for player in players
                if any(membership.team_id in visible_team_ids for membership in player.team_memberships)
            ]

        return players

    def _ensure_player_visible(self, player: Player, current_user: AuthUserOut | None) -> Player:
        if current_user is None:
            return player

        visible_player_ids = {visible_player.id for visible_player in self._filter_visible_players([player], current_user)}
        if player.id in visible_player_ids:
            return player

        raise NotFoundException("Player not found")

    def _ensure_visible_team_ids(self, team_ids: list[int], current_user: AuthUserOut | None) -> None:
        if current_user is None or not team_ids or self._has_global_scope(current_user):
            return

        if self._is_coach_scoped_user(current_user):
            visible_team_ids = self._get_visible_team_ids(current_user) or set()
            missing_team_ids = sorted(set(team_ids) - visible_team_ids)
            if missing_team_ids:
                raise ForbiddenException("No tienes permisos para asignar algunos equipos a este jugador.")

    def _ensure_player_user_account(self, player: Player) -> tuple[User, bool]:
        normalized_email = player.email.strip().lower()
        role = self.role_repo.get_or_create(self.PLAYER_ROLE_NAME)
        apply_default_permissions_to_role(role, ensure_catalog_permissions(self.permission_repo))
        user = self.user_repo.get_by_email(normalized_email, include_deleted=True)

        if user is None:
            user = User(
                name=player.name.strip(),
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
            user.name = player.name.strip()
            user.account_status = "pending"
            should_invite = True

        if role not in user.roles:
            user.roles = [*user.roles, role]

        return user, should_invite

    def _send_profile_completion_email(self, *, player: Player, user: User) -> None:
        token = create_account_invitation_token(
            user_id=user.id,
            email=user.email,
            role=self.PLAYER_ROLE_NAME,
            player_id=player.id,
        )
        completion_url = build_account_invitation_url(token)
        escaped_name = escape(player.name)
        escaped_url = escape(completion_url, quote=True)
        text_body = (
            f"Hola {player.name},\n\n"
            "Te invitaron a completar tu perfil de jugador en ScoreBlaze.\n"
            "Con este enlace podras validar tu cuenta, crear tu contrasena y completar tus datos deportivos.\n\n"
            f"{completion_url}\n\n"
            f"Este enlace vence en {config.ACCOUNT_INVITATION_TOKEN_EXPIRES_HOURS} horas.\n"
        )
        html_body = f"""
        <p>Hola {escaped_name},</p>
        <p>Te invitaron a completar tu perfil de jugador en <strong>ScoreBlaze</strong>.</p>
        <p>Con este enlace podras validar tu cuenta, crear tu contrasena y completar tus datos deportivos.</p>
        <p><a href="{escaped_url}">Completar perfil</a></p>
        <p>Este enlace vence en {config.ACCOUNT_INVITATION_TOKEN_EXPIRES_HOURS} horas.</p>
        """

        self.email_sender.send(
            EmailMessage(
                to_email=player.email,
                subject="Completa tu perfil de jugador en ScoreBlaze",
                text_body=text_body,
                html_body=html_body,
            )
        )

    def create(self, data: PlayerCreate, current_user: AuthUserOut | None = None) -> Player:
        self.policy.ensure_email_available(data.email)
        self._ensure_visible_team_ids(data.team_ids, current_user)

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
        should_send_invitation = False
        invited_user: User | None = None

        with self.unit_of_work.transaction():
            self.player_repo.add(player)
            self.unit_of_work.flush()
            invited_user, should_send_invitation = self._ensure_player_user_account(player)
            self.unit_of_work.flush()

            if validated_team_ids:
                self.membership_repo.replace_team_ids_for_player(player.id, validated_team_ids)
        self.unit_of_work.refresh(player)

        if should_send_invitation and invited_user is not None:
            try:
                self._send_profile_completion_email(player=player, user=invited_user)
            except Exception:
                logger.exception("Could not send player profile invitation email for player_id=%s", player.id)

        return player

    def list(self, current_user: AuthUserOut | None = None) -> list[Player]:
        players = self.player_repo.list()
        return self._filter_visible_players(players, current_user)

    def list_table(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        team_filter: str,
        sort_key: str,
        sort_dir: str,
        current_user: AuthUserOut | None = None,
    ) -> PaginatedPlayersTableOut:
        players = self._filter_visible_players(self.player_repo.list(), current_user)
        teams_by_id = {team.id: team for team in self.team_repo.list()}
        visible_team_ids = None if current_user is None else self._get_visible_team_ids(current_user)
        rows: list[PlayerTableRowOut] = []

        for player in players:
            team_ids = sorted(
                {
                    membership.team_id
                    for membership in player.team_memberships
                    if visible_team_ids is None or membership.team_id in visible_team_ids
                }
            )
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

    def get(self, player_id: int, current_user: AuthUserOut | None = None) -> Player:
        player = self.policy.get_existing_player(player_id)
        return self._ensure_player_visible(player, current_user)

    def list_teams(self, player_id: int, current_user: AuthUserOut | None = None) -> list[TeamOut]:
        self.get(player_id, current_user)
        visible_team_ids = None if current_user is None else self._get_visible_team_ids(current_user)
        teams = []
        for relation in self.membership_repo.list_by_player(player_id):
            if visible_team_ids is not None and relation.team_id not in visible_team_ids:
                continue
            team = self.team_repo.get(relation.team_id)
            if team:
                teams.append(team)
        return teams

    def update(self, player_id: int, data: PlayerUpdate, current_user: AuthUserOut | None = None) -> Player:
        player = self.get(player_id, current_user)
        self.policy.ensure_email_available(data.email, current_player_id=player_id)
        self._ensure_visible_team_ids(data.team_ids, current_user)

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

    def delete(self, player_id: int, current_user: AuthUserOut | None = None) -> None:
        player = self.get(player_id, current_user)
        with self.unit_of_work.transaction():
            self.player_repo.delete(player)
