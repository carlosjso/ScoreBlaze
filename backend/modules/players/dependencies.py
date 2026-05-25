from fastapi import Depends

from core.email import EmailSender, create_email_sender
from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository
from modules.teams.repositories import TeamRepository
from modules.users.repositories import PermissionRepository, RoleRepository, UserRepository

from .policy import PlayerPolicy
from .repositories import PlayerRepository
from .service import PlayerService


def get_player_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PlayerRepository:
    return PlayerRepository(unit_of_work.db)


def get_team_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> TeamRepository:
    return TeamRepository(unit_of_work.db)


def get_membership_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MembershipRepository:
    return MembershipRepository(unit_of_work.db)


def get_user_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> UserRepository:
    return UserRepository(unit_of_work.db)


def get_role_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> RoleRepository:
    return RoleRepository(unit_of_work.db)


def get_permission_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PermissionRepository:
    return PermissionRepository(unit_of_work.db)


def get_email_sender() -> EmailSender:
    return create_email_sender()


def get_player_policy(
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
) -> PlayerPolicy:
    return PlayerPolicy(player_repo, team_repo)


def get_player_service(
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    user_repo: UserRepository = Depends(get_user_repository),
    role_repo: RoleRepository = Depends(get_role_repository),
    permission_repo: PermissionRepository = Depends(get_permission_repository),
    email_sender: EmailSender = Depends(get_email_sender),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: PlayerPolicy = Depends(get_player_policy),
) -> PlayerService:
    return PlayerService(
        player_repo,
        team_repo,
        membership_repo,
        user_repo,
        role_repo,
        permission_repo,
        email_sender,
        unit_of_work,
        policy,
    )
