from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository
from modules.teams.repositories import TeamRepository

from .policy import PlayerPolicy
from .repositories import PlayerRepository
from .service import PlayerService


def get_player_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PlayerRepository:
    return PlayerRepository(unit_of_work.db)


def get_team_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> TeamRepository:
    return TeamRepository(unit_of_work.db)


def get_membership_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MembershipRepository:
    return MembershipRepository(unit_of_work.db)


def get_player_policy(
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
) -> PlayerPolicy:
    return PlayerPolicy(player_repo, team_repo)


def get_player_service(
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: PlayerPolicy = Depends(get_player_policy),
) -> PlayerService:
    return PlayerService(player_repo, team_repo, membership_repo, unit_of_work, policy)
