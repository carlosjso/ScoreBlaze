from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork

from .policy import UserPolicy
from .repositories import RoleRepository, UserRepository
from .role_service import RoleService
from .service import UserService


def get_user_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> UserRepository:
    return UserRepository(unit_of_work.db)


def get_role_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> RoleRepository:
    return RoleRepository(unit_of_work.db)


def get_user_policy(user_repo: UserRepository = Depends(get_user_repository)) -> UserPolicy:
    return UserPolicy(user_repo)


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
    role_repo: RoleRepository = Depends(get_role_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: UserPolicy = Depends(get_user_policy),
) -> UserService:
    return UserService(user_repo, role_repo, unit_of_work, policy)


def get_role_service(
    role_repo: RoleRepository = Depends(get_role_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
) -> RoleService:
    return RoleService(role_repo, unit_of_work)
