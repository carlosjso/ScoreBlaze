from __future__ import annotations

from authentication.schemas import AuthUserOut
from core.exceptions import ForbiddenException, NotFoundException, ValidationException
from data.orm import TeamMembership
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository
from modules.users.role_names import GLOBAL_SCOPE_ROLE_NAMES, PLAYER_ROLE_NAME, TEAM_MANAGER_ROLE_NAMES

from .policy import TeamMembershipPolicy
from .schemas import TeamMembershipCreate, TeamMembershipUpdate, TeamShirtNumbersUpdate


class TeamMembershipService:
    ADMIN_ROLE_NAMES = GLOBAL_SCOPE_ROLE_NAMES
    COACH_ROLE_NAMES = TEAM_MANAGER_ROLE_NAMES
    PLAYER_ROLE_NAME = PLAYER_ROLE_NAME

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
        return not cls.COACH_ROLE_NAMES.isdisjoint(role_names) and cls.ADMIN_ROLE_NAMES.isdisjoint(role_names)

    @classmethod
    def _is_player_scoped_user(cls, current_user: AuthUserOut) -> bool:
        role_names = cls._role_names(current_user)
        return (
            cls.PLAYER_ROLE_NAME in role_names
            and cls.COACH_ROLE_NAMES.isdisjoint(role_names)
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

    def _resolve_shirt_number(
        self,
        team_id: int,
        requested_number: str | None,
        *,
        exclude_player_id: int | None = None,
    ) -> str:
        normalized_number = (requested_number or "").strip()
        if not normalized_number:
            return self.membership_repo.next_available_shirt_number(
                team_id,
                exclude_player_id=exclude_player_id,
            )
        if not self.membership_repo.is_shirt_number_available(
            team_id,
            normalized_number,
            exclude_player_id=exclude_player_id,
        ):
            raise ValidationException(
                f"El numero {normalized_number} ya esta asignado a otro jugador de este equipo."
            )
        return normalized_number

    def create(self, data: TeamMembershipCreate, current_user: AuthUserOut | None = None) -> TeamMembership:
        self.policy.ensure_player_and_team_exist(data.player_id, data.team_id)
        self.policy.ensure_new_membership(data.player_id, data.team_id)
        self._ensure_team_visible(data.team_id, current_user)
        shirt_number = self._resolve_shirt_number(data.team_id, data.shirt_number)

        relation = TeamMembership(
            player_id=data.player_id,
            team_id=data.team_id,
            shirt_number=shirt_number,
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
        shirt_number = self._resolve_shirt_number(
            team_id,
            data.shirt_number,
            exclude_player_id=player_id,
        )

        with self.unit_of_work.transaction():
            self.membership_repo.update(relation, shirt_number=shirt_number)
        self.unit_of_work.refresh(relation)
        return relation

    def delete(self, player_id: int, team_id: int, current_user: AuthUserOut | None = None) -> None:
        relation = self.get(player_id, team_id, current_user)
        with self.unit_of_work.transaction():
            self.membership_repo.delete(relation)

    def update_shirt_numbers(
        self,
        team_id: int,
        data: TeamShirtNumbersUpdate,
        current_user: AuthUserOut | None = None,
    ) -> list[TeamMembership]:
        self.policy.ensure_team_exists(team_id)
        self._ensure_team_visible(team_id, current_user)
        memberships = self.membership_repo.list_by_team(team_id)
        memberships_by_player_id = {membership.player_id: membership for membership in memberships}
        assignments: dict[int, str] = {}
        for item in data.assignments:
            if item.player_id in assignments:
                raise ValidationException("Cada jugador debe aparecer una sola vez.")
            if item.player_id not in memberships_by_player_id:
                raise ValidationException("Uno de los jugadores ya no pertenece a este equipo.")
            assignments[item.player_id] = item.shirt_number.strip()

        final_numbers = {
            membership.player_id: assignments.get(
                membership.player_id,
                (membership.shirt_number or "").strip(),
            )
            for membership in memberships
        }
        used_keys: set[str] = set()
        for shirt_number in final_numbers.values():
            key = self.membership_repo.shirt_number_key(shirt_number)
            if not key:
                raise ValidationException("Todos los jugadores deben tener numero de camiseta.")
            if key in used_keys:
                raise ValidationException(f"El numero {shirt_number} esta repetido dentro del equipo.")
            used_keys.add(key)

        changed_memberships = [
            membership
            for membership in memberships
            if membership.player_id in assignments
            and membership.shirt_number != assignments[membership.player_id]
        ]
        occupied_temporary_numbers = {
            (membership.shirt_number or "").strip()
            for membership in memberships
        }
        temporary_numbers: dict[int, str] = {}
        for membership in changed_memberships:
            temporary_number = f"@{membership.player_id:x}"
            while temporary_number in occupied_temporary_numbers:
                temporary_number = f"@{temporary_number}"
            temporary_numbers[membership.player_id] = temporary_number
            occupied_temporary_numbers.add(temporary_number)

        with self.unit_of_work.transaction():
            # Temporary unique values allow safe swaps such as 7 <-> 10.
            for membership in changed_memberships:
                self.membership_repo.update(
                    membership,
                    shirt_number=temporary_numbers[membership.player_id],
                )
            for membership in changed_memberships:
                self.membership_repo.update(
                    membership,
                    shirt_number=assignments[membership.player_id],
                )

        return self.membership_repo.list_by_team(team_id)

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
