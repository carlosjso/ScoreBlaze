from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from core.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

from modules.teams.schemas import TeamOut

from .dependencies import get_player_service
from .schemas import PaginatedPlayersTableOut, PlayerCreate, PlayerOut, PlayerUpdate
from .service import PlayerService

router = APIRouter()


@router.get("/", response_model=list[PlayerOut], status_code=status.HTTP_200_OK)
def list_players(service: PlayerService = Depends(get_player_service)):
    return service.list()


@router.get("/table", response_model=PaginatedPlayersTableOut, status_code=status.HTTP_200_OK)
def list_players_table(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    search: str = Query(default=""),
    team_filter: str = Query(default="all", pattern=r"^(all|none|\d+)$"),
    sort_key: Literal["id", "name"] = Query(default="id"),
    sort_dir: Literal["asc", "desc"] = Query(default="asc"),
    service: PlayerService = Depends(get_player_service),
):
    return service.list_table(
        page=page,
        page_size=page_size,
        search=search,
        team_filter=team_filter,
        sort_key=sort_key,
        sort_dir=sort_dir,
    )


@router.post("/", response_model=PlayerOut, status_code=status.HTTP_201_CREATED)
def create_player(payload: PlayerCreate, service: PlayerService = Depends(get_player_service)):
    return service.create(payload)


@router.get("/{player_id}", response_model=PlayerOut, status_code=status.HTTP_200_OK)
def get_player(player_id: int, service: PlayerService = Depends(get_player_service)):
    return service.get(player_id)


@router.put("/{player_id}", response_model=PlayerOut, status_code=status.HTTP_200_OK)
def update_player(
    player_id: int,
    payload: PlayerUpdate,
    service: PlayerService = Depends(get_player_service),
):
    return service.update(player_id, payload)


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(player_id: int, service: PlayerService = Depends(get_player_service)):
    service.delete(player_id)


@router.get("/{player_id}/teams", response_model=list[TeamOut], status_code=status.HTTP_200_OK)
def list_player_teams(
    player_id: int,
    service: PlayerService = Depends(get_player_service),
):
    return service.list_teams(player_id)
