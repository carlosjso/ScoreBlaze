from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork

from .policy import PlayerStatPolicy, TeamStatPolicy
from .player_stat_service import PlayerStatService
from .repositories import PlayerStatRepository, TeamStatRepository
from .team_stat_service import TeamStatService


def get_player_stat_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PlayerStatRepository:
    return PlayerStatRepository(unit_of_work.db)


def get_team_stat_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> TeamStatRepository:
    return TeamStatRepository(unit_of_work.db)


def get_player_stat_policy(
    player_stat_repo: PlayerStatRepository = Depends(get_player_stat_repository),
) -> PlayerStatPolicy:
    return PlayerStatPolicy(player_stat_repo)


def get_team_stat_policy(
    team_stat_repo: TeamStatRepository = Depends(get_team_stat_repository),
) -> TeamStatPolicy:
    return TeamStatPolicy(team_stat_repo)


def get_player_stat_service(
    player_stat_repo: PlayerStatRepository = Depends(get_player_stat_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: PlayerStatPolicy = Depends(get_player_stat_policy),
) -> PlayerStatService:
    return PlayerStatService(player_stat_repo, unit_of_work, policy)


def get_team_stat_service(
    team_stat_repo: TeamStatRepository = Depends(get_team_stat_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: TeamStatPolicy = Depends(get_team_stat_policy),
) -> TeamStatService:
    return TeamStatService(team_stat_repo, unit_of_work, policy)
