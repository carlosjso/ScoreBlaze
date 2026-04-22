from fastapi import Depends
from sqlalchemy.orm import Session

from database.alchemy import get_db
from repositories import (
    MatchRepository,
    MembershipRepository,
    PlayerRepository,
    PlayerStatRepository,
    TeamRepository,
    UserRepository,
)
from services import (
    MatchService,
    PlayerService,
    PlayerStatService,
    TeamMembershipService,
    TeamService,
    UserService,
)


# Repositorios
def get_match_repository(db: Session = Depends(get_db)) -> MatchRepository:
    return MatchRepository(db)


def get_player_repository(db: Session = Depends(get_db)) -> PlayerRepository:
    return PlayerRepository(db)


def get_player_stat_repository(db: Session = Depends(get_db)) -> PlayerStatRepository:
    return PlayerStatRepository(db)


def get_team_repository(db: Session = Depends(get_db)) -> TeamRepository:
    return TeamRepository(db)


def get_membership_repository(db: Session = Depends(get_db)) -> MembershipRepository:
    return MembershipRepository(db)


def get_user_repository(db: Session = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


# Servicios
def get_match_service(
    match_repo: MatchRepository = Depends(get_match_repository),
) -> MatchService:
    return MatchService(match_repo)


def get_player_service(
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
) -> PlayerService:
    return PlayerService(player_repo, team_repo, membership_repo)


def get_team_service(
    team_repo: TeamRepository = Depends(get_team_repository),
    player_repo: PlayerRepository = Depends(get_player_repository),
    membership_repo: MembershipRepository = Depends(get_membership_repository),
) -> TeamService:
    return TeamService(team_repo, player_repo, membership_repo)


def get_player_stat_service(
    player_stat_repo: PlayerStatRepository = Depends(get_player_stat_repository),
) -> PlayerStatService:
    return PlayerStatService(player_stat_repo)


def get_team_membership_service(
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
) -> TeamMembershipService:
    return TeamMembershipService(membership_repo, player_repo, team_repo)


def get_user_service(
    user_repo: UserRepository = Depends(get_user_repository),
) -> UserService:
    return UserService(user_repo)


# Backward-compatible alias.
def get_membership_service(
    membership_repo: MembershipRepository = Depends(get_membership_repository),
    player_repo: PlayerRepository = Depends(get_player_repository),
    team_repo: TeamRepository = Depends(get_team_repository),
) -> TeamMembershipService:
    return get_team_membership_service(membership_repo, player_repo, team_repo)
