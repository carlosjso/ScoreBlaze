from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork

from .policy import MatchEventPolicy
from .repositories import MatchEventRepository
from .service import MatchEventService


def get_match_event_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MatchEventRepository:
    return MatchEventRepository(unit_of_work.db)


def get_match_event_policy(
    match_event_repo: MatchEventRepository = Depends(get_match_event_repository),
) -> MatchEventPolicy:
    return MatchEventPolicy(match_event_repo)


def get_match_event_service(
    match_event_repo: MatchEventRepository = Depends(get_match_event_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: MatchEventPolicy = Depends(get_match_event_policy),
) -> MatchEventService:
    return MatchEventService(match_event_repo, unit_of_work, policy)
