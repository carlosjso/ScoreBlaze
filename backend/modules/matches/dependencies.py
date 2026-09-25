from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork
from modules.access_scope import TeamAccessScopeResolver
from modules.leagues.repositories import LeagueRepository
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository

from .policy import MatchPolicy
from .repositories import MatchRepository
from .service import MatchService


def get_match_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MatchRepository:
    return MatchRepository(unit_of_work.db)


def get_league_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> LeagueRepository:
    return LeagueRepository(unit_of_work.db)


def get_team_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> TeamRepository:
    return TeamRepository(unit_of_work.db)


def get_player_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PlayerRepository:
    return PlayerRepository(unit_of_work.db)


def get_membership_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MembershipRepository:
    return MembershipRepository(unit_of_work.db)


def get_match_policy(
    match_repo: MatchRepository = Depends(get_match_repository),
    league_repo: LeagueRepository = Depends(get_league_repository),
) -> MatchPolicy:
    return MatchPolicy(match_repo, league_repo)


def get_match_service(
    match_repo: MatchRepository = Depends(get_match_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
    player_repo: PlayerRepository = Depends(get_player_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: MatchPolicy = Depends(get_match_policy),
) -> MatchService:
    return MatchService(
        match_repo,
        TeamAccessScopeResolver(team_repo, player_repo, membership_repo),
        unit_of_work,
        policy,
    )
