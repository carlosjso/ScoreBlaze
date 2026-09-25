from __future__ import annotations

from authentication.schemas import AuthUserOut

from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository


class TeamAccessScopeResolver:
    ADMIN_ROLE_NAMES = {"admin", "superadmin"}
    COACH_ROLE_NAME = "coach"
    PLAYER_ROLE_NAME = "jugador"

    def __init__(
        self,
        team_repo: TeamRepository,
        player_repo: PlayerRepository,
        membership_repo: MembershipRepository,
    ):
        self.team_repo = team_repo
        self.player_repo = player_repo
        self.membership_repo = membership_repo

    @staticmethod
    def normalize_email(value: str) -> str:
        return value.strip().lower()

    @classmethod
    def role_names(cls, current_user: AuthUserOut) -> set[str]:
        return {role.strip().lower() for role in current_user.roles}

    @classmethod
    def has_global_scope(cls, current_user: AuthUserOut) -> bool:
        return not cls.ADMIN_ROLE_NAMES.isdisjoint(cls.role_names(current_user))

    @classmethod
    def is_coach_scoped_user(cls, current_user: AuthUserOut) -> bool:
        role_names = cls.role_names(current_user)
        return cls.COACH_ROLE_NAME in role_names and cls.ADMIN_ROLE_NAMES.isdisjoint(role_names)

    @classmethod
    def is_player_scoped_user(cls, current_user: AuthUserOut) -> bool:
        role_names = cls.role_names(current_user)
        return (
            cls.PLAYER_ROLE_NAME in role_names
            and cls.COACH_ROLE_NAME not in role_names
            and cls.ADMIN_ROLE_NAMES.isdisjoint(role_names)
        )

    def get_visible_team_ids(self, current_user: AuthUserOut) -> set[int] | None:
        if self.has_global_scope(current_user):
            return None

        normalized_email = self.normalize_email(current_user.email)
        if self.is_coach_scoped_user(current_user):
            return {
                team.id
                for team in self.team_repo.list()
                if self.normalize_email(team.responsible_email or "") == normalized_email
            }

        if self.is_player_scoped_user(current_user):
            player = self.player_repo.get_by_email(normalized_email)
            if player is None:
                return set()
            return {membership.team_id for membership in self.membership_repo.list_by_player(player.id)}

        return None
