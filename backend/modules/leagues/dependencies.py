from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork
from modules.access_scope import TeamAccessScopeResolver
from modules.match_events.repositories import MatchEventRepository
from modules.match_participations.repositories import MatchPlayerParticipationRepository
from modules.matches.repositories import MatchRepository
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository

from .policy import LeaguePolicy
from .repositories import LeagueMembershipRepository, LeagueRepository, LeagueStatRepository
from .service import LeagueService
from .stats_service import LeagueStatsService


def get_league_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> LeagueRepository:
    return LeagueRepository(unit_of_work.db)


def get_league_membership_repository(
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
) -> LeagueMembershipRepository:
    return LeagueMembershipRepository(unit_of_work.db)


def get_league_stat_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> LeagueStatRepository:
    return LeagueStatRepository(unit_of_work.db)


def get_team_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> TeamRepository:
    return TeamRepository(unit_of_work.db)


def get_player_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> PlayerRepository:
    return PlayerRepository(unit_of_work.db)


def get_match_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MatchRepository:
    return MatchRepository(unit_of_work.db)


def get_membership_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MembershipRepository:
    return MembershipRepository(unit_of_work.db)


def get_match_event_repository(unit_of_work: UnitOfWork = Depends(get_unit_of_work)) -> MatchEventRepository:
    return MatchEventRepository(unit_of_work.db)


def get_match_participation_repository(
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
) -> MatchPlayerParticipationRepository:
    return MatchPlayerParticipationRepository(unit_of_work.db)


def get_league_policy(
    league_repo: LeagueRepository = Depends(get_league_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
) -> LeaguePolicy:
    return LeaguePolicy(league_repo, team_repo)


def get_league_service(
    league_repo: LeagueRepository = Depends(get_league_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
    player_repo: PlayerRepository = Depends(get_player_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    league_membership_repo: LeagueMembershipRepository = Depends(get_league_membership_repository),
    match_repo: MatchRepository = Depends(get_match_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: LeaguePolicy = Depends(get_league_policy),
) -> LeagueService:
    return LeagueService(
        league_repo=league_repo,
        team_repo=team_repo,
        scope_resolver=TeamAccessScopeResolver(team_repo, player_repo, membership_repo),
        league_membership_repo=league_membership_repo,
        match_repo=match_repo,
        unit_of_work=unit_of_work,
        policy=policy,
    )


def get_league_stats_service(
    league_repo: LeagueRepository = Depends(get_league_repository),
    league_stat_repo: LeagueStatRepository = Depends(get_league_stat_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
    player_repo: PlayerRepository = Depends(get_player_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    match_repo: MatchRepository = Depends(get_match_repository),
    match_event_repo: MatchEventRepository = Depends(get_match_event_repository),
    match_participation_repo: MatchPlayerParticipationRepository = Depends(get_match_participation_repository),
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    policy: LeaguePolicy = Depends(get_league_policy),
) -> LeagueStatsService:
    return LeagueStatsService(
        league_repo=league_repo,
        league_stat_repo=league_stat_repo,
        team_repo=team_repo,
        player_repo=player_repo,
        scope_resolver=TeamAccessScopeResolver(team_repo, player_repo, membership_repo),
        match_repo=match_repo,
        match_event_repo=match_event_repo,
        match_participation_repo=match_participation_repo,
        unit_of_work=unit_of_work,
        policy=policy,
    )
