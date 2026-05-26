from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.users.repositories import PermissionRepository, RoleRepository, UserRepository

from .service import AccountInvitationService


def get_user_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> UserRepository:
    return UserRepository(unit_of_work.db)


def get_role_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> RoleRepository:
    return RoleRepository(unit_of_work.db)


def get_permission_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PermissionRepository:
    return PermissionRepository(unit_of_work.db)


def get_player_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PlayerRepository:
    return PlayerRepository(unit_of_work.db)


def get_team_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> TeamRepository:
    return TeamRepository(unit_of_work.db)


def get_account_invitation_service(
    user_repo: UserRepository = Depends(get_user_repository),
    role_repo: RoleRepository = Depends(get_role_repository),
    permission_repo: PermissionRepository = Depends(get_permission_repository),
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
) -> AccountInvitationService:
    return AccountInvitationService(user_repo, role_repo, permission_repo, player_repo, team_repo, unit_of_work)
