from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from authentication.dependencies import require_permissions
from core.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE
from modules.matches.schemas import MatchOut

from .dependencies import get_league_service, get_league_stats_service
from .domain import LeagueCompetitionType
from .schemas import (
    LeagueCreate,
    LeagueDetailOut,
    LeagueOut,
    LeagueStatsSnapshotOut,
    LeagueTeamAssignmentsUpdate,
    LeagueUpdate,
    PaginatedLeaguesTableOut,
)
from .service import LeagueService
from .stats_service import LeagueStatsService

router = APIRouter()


@router.get("/", response_model=list[LeagueOut], status_code=status.HTTP_200_OK)
def list_leagues(
    competition_type: LeagueCompetitionType | None = Query(default=None),
    service: LeagueService = Depends(get_league_service),
    _=Depends(require_permissions("leagues.view")),
):
    return service.list(competition_type=competition_type.value if competition_type else None)


@router.get("/table", response_model=PaginatedLeaguesTableOut, status_code=status.HTTP_200_OK)
def list_leagues_table(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    search: str = Query(default=""),
    sort_key: Literal["id", "name", "status", "teams"] = Query(default="name"),
    sort_dir: Literal["asc", "desc"] = Query(default="asc"),
    competition_type: LeagueCompetitionType | None = Query(default=None),
    service: LeagueService = Depends(get_league_service),
    _=Depends(require_permissions("leagues.view")),
):
    return service.list_table(
        page=page,
        page_size=page_size,
        search=search,
        sort_key=sort_key,
        sort_dir=sort_dir,
        competition_type=competition_type.value if competition_type else None,
    )


@router.post("/", response_model=LeagueOut, status_code=status.HTTP_201_CREATED)
def create_league(
    payload: LeagueCreate,
    service: LeagueService = Depends(get_league_service),
    _=Depends(require_permissions("leagues.create")),
):
    return service.create(payload)


@router.get("/{league_id}", response_model=LeagueDetailOut, status_code=status.HTTP_200_OK)
def get_league(
    league_id: int,
    service: LeagueService = Depends(get_league_service),
    _=Depends(require_permissions("leagues.view")),
):
    return service.get(league_id)


@router.get("/{league_id}/matches", response_model=list[MatchOut], status_code=status.HTTP_200_OK)
def list_league_matches(
    league_id: int,
    service: LeagueService = Depends(get_league_service),
    _=Depends(require_permissions("leagues.view")),
):
    return service.list_matches(league_id)


@router.get("/{league_id}/stats", response_model=LeagueStatsSnapshotOut, status_code=status.HTTP_200_OK)
def get_league_stats(
    league_id: int,
    service: LeagueStatsService = Depends(get_league_stats_service),
    _=Depends(require_permissions("leagues.view")),
):
    return service.get(league_id)


@router.put("/{league_id}", response_model=LeagueOut, status_code=status.HTTP_200_OK)
def update_league(
    league_id: int,
    payload: LeagueUpdate,
    service: LeagueService = Depends(get_league_service),
    _=Depends(require_permissions("leagues.edit")),
):
    return service.update(league_id, payload)


@router.put("/{league_id}/teams", response_model=LeagueOut, status_code=status.HTTP_200_OK)
def replace_league_teams(
    league_id: int,
    payload: LeagueTeamAssignmentsUpdate,
    service: LeagueService = Depends(get_league_service),
    _=Depends(require_permissions("leagues.edit")),
):
    return service.replace_team_assignments(league_id, payload)


@router.delete("/{league_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_league(
    league_id: int,
    service: LeagueService = Depends(get_league_service),
    _=Depends(require_permissions("leagues.delete")),
):
    service.delete(league_id)
