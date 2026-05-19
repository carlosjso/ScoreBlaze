from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork
from modules.leagues.repositories import LeagueRepository

from .policy import MatchPolicy
from .repositories import MatchRepository
from .service import MatchService


def get_match_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MatchRepository:
    return MatchRepository(unit_of_work.db)


def get_league_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> LeagueRepository:
    return LeagueRepository(unit_of_work.db)


def get_match_policy(
    match_repo: MatchRepository = Depends(get_match_repository),
    league_repo: LeagueRepository = Depends(get_league_repository),
) -> MatchPolicy:
    return MatchPolicy(match_repo, league_repo)


def get_match_service(
    match_repo: MatchRepository = Depends(get_match_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: MatchPolicy = Depends(get_match_policy),
) -> MatchService:
    return MatchService(match_repo, unit_of_work, policy)
