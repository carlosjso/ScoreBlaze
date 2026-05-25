from __future__ import annotations

from authentication.schemas import AuthUserOut
from core.exceptions import ForbiddenException, NotFoundException
from data.orm import TeamMembership
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository

from .policy import TeamMembershipPolicy
from .schemas import TeamMembershipCreate, TeamMembershipUpdate


class TeamMembershipService:
    ADMIN_ROLE_NAMES = {"admin", "superadmin"}
    COACH_ROLE_NAME = "coach"
    PLAYER_ROLE_NAME = "jugador"

    def __init__(
        self,
        membership_repo: MembershipRepository,
        unit_of_work: UnitOfWork,
        policy: TeamMembershipPolicy,
    ):
        self.membership_repo = membership_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

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

        normalized_email = self._normalize_email(current_user.email)
        if self._is_coach_scoped_user(current_user):
            return {
                team.id
                for team in self.policy.team_repo.list()
                if self._normalize_email(team.responsible_email or "") == normalized_email
            }

        if self._is_player_scoped_user(current_user):
            player = self.policy.player_repo.get_by_email(normalized_email)
            if player is None:
                return set()
            return {membership.team_id for membership in self.membership_repo.list_by_player(player.id)}

        return None

    def _ensure_team_visible(self, team_id: int, current_user: AuthUserOut | None) -> None:
        if current_user is None:
            return

        visible_team_ids = self._get_visible_team_ids(current_user)
        if visible_team_ids is None or team_id in visible_team_ids:
            return

        raise NotFoundException("Team not found")

    def create(self, data: TeamMembershipCreate, current_user: AuthUserOut | None = None) -> TeamMembership:
        self.policy.ensure_player_and_team_exist(data.player_id, data.team_id)
        self.policy.ensure_new_membership(data.player_id, data.team_id)
        self._ensure_team_visible(data.team_id, current_user)

        relation = TeamMembership(
            player_id=data.player_id,
            team_id=data.team_id,
            shirt_number=data.shirt_number,
        )
        with self.unit_of_work.transaction():
            self.membership_repo.add(relation)
        self.unit_of_work.refresh(relation)
        return relation

    def list(self, current_user: AuthUserOut | None = None) -> list[TeamMembership]:
        memberships = self.membership_repo.list()
        if current_user is None:
            return memberships

        visible_team_ids = self._get_visible_team_ids(current_user)
        if visible_team_ids is None:
            return memberships

        return [membership for membership in memberships if membership.team_id in visible_team_ids]

    def get(self, player_id: int, team_id: int, current_user: AuthUserOut | None = None) -> TeamMembership:
        self._ensure_team_visible(team_id, current_user)
        return self.policy.get_existing_membership(player_id, team_id)

    def update(
        self,
        player_id: int,
        team_id: int,
        data: TeamMembershipUpdate,
        current_user: AuthUserOut | None = None,
    ) -> TeamMembership:
        relation = self.get(player_id, team_id, current_user)

        with self.unit_of_work.transaction():
            self.membership_repo.update(relation, shirt_number=data.shirt_number)
        self.unit_of_work.refresh(relation)
        return relation

    def delete(self, player_id: int, team_id: int, current_user: AuthUserOut | None = None) -> None:
        relation = self.get(player_id, team_id, current_user)
        with self.unit_of_work.transaction():
            self.membership_repo.delete(relation)

    def list_by_team(self, team_id: int, current_user: AuthUserOut | None = None) -> list[TeamMembership]:
        self.policy.ensure_team_exists(team_id)
        self._ensure_team_visible(team_id, current_user)
        return self.membership_repo.list_by_team(team_id)

    def list_by_player(self, player_id: int, current_user: AuthUserOut | None = None) -> list[TeamMembership]:
        self.policy.ensure_player_exists(player_id)
        if current_user is not None and self._is_player_scoped_user(current_user):
            player = self.policy.player_repo.get(player_id)
            if player is None or self._normalize_email(player.email) != self._normalize_email(current_user.email):
                raise ForbiddenException("No tienes permisos para consultar estas membresias.")
        return self.membership_repo.list_by_player(player_id)
