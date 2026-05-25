from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from authentication.dependencies import require_permissions
from authentication.schemas import AuthUserOut
from core.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

from modules.players.schemas import PlayerOut

from .dependencies import get_team_service
from .schemas import PaginatedTeamsTableOut, TeamCreate, TeamOut, TeamUpdate
from .service import TeamService

router = APIRouter()


@router.get("/", response_model=list[TeamOut], status_code=status.HTTP_200_OK)
def list_teams(
    service: TeamService = Depends(get_team_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.view")),
):
    return service.list(current_user)


@router.get("/table", response_model=PaginatedTeamsTableOut, status_code=status.HTTP_200_OK)
def list_teams_table(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    search: str = Query(default=""),
    sort_key: Literal["id", "name", "players"] = Query(default="name"),
    sort_dir: Literal["asc", "desc"] = Query(default="asc"),
    service: TeamService = Depends(get_team_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.view")),
):
    return service.list_table(
        page=page,
        page_size=page_size,
        search=search,
        sort_key=sort_key,
        sort_dir=sort_dir,
        current_user=current_user,
    )


@router.post("/", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: TeamCreate,
    service: TeamService = Depends(get_team_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.create")),
):
    return service.create(payload, current_user)


@router.get("/{team_id}", response_model=TeamOut, status_code=status.HTTP_200_OK)
def get_team(
    team_id: int,
    service: TeamService = Depends(get_team_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.view")),
):
    return service.get(team_id, current_user)


@router.put("/{team_id}", response_model=TeamOut, status_code=status.HTTP_200_OK)
def update_team(
    team_id: int,
    payload: TeamUpdate,
    service: TeamService = Depends(get_team_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.edit")),
):
    return service.update(team_id, payload, current_user)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: int,
    service: TeamService = Depends(get_team_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.delete")),
):
    service.delete(team_id, current_user)


@router.get("/{team_id}/players", response_model=list[PlayerOut], status_code=status.HTTP_200_OK)
def list_team_players(
    team_id: int,
    service: TeamService = Depends(get_team_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.view")),
):
    return service.list_players(team_id, current_user)
