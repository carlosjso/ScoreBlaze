from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository

from .policy import TeamMembershipPolicy
from .repositories import MembershipRepository
from .service import TeamMembershipService


def get_membership_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MembershipRepository:
    return MembershipRepository(unit_of_work.db)


def get_player_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PlayerRepository:
    return PlayerRepository(unit_of_work.db)


def get_team_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> TeamRepository:
    return TeamRepository(unit_of_work.db)


def get_team_membership_policy(
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
) -> TeamMembershipPolicy:
    return TeamMembershipPolicy(membership_repo, player_repo, team_repo)


def get_team_membership_service(
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: TeamMembershipPolicy = Depends(get_team_membership_policy),
) -> TeamMembershipService:
    return TeamMembershipService(membership_repo, unit_of_work, policy)


def get_membership_service(
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: TeamMembershipPolicy = Depends(get_team_membership_policy),
) -> TeamMembershipService:
    return TeamMembershipService(membership_repo, unit_of_work, policy)
