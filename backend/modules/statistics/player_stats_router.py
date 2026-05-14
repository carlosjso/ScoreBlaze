from fastapi import APIRouter, Depends, status

from authentication.dependencies import require_permissions

from .dependencies import get_player_stat_service
from .player_stat_service import PlayerStatService
from .schemas import PlayerStatCreate, PlayerStatOut, PlayerStatUpdate

router = APIRouter()


@router.get("/", response_model=list[PlayerStatOut], status_code=status.HTTP_200_OK)
def list_player_stats(
    service: PlayerStatService = Depends(get_player_stat_service),
    _=Depends(require_permissions("players.view")),
):
    return service.list()


@router.post("/", response_model=PlayerStatOut, status_code=status.HTTP_201_CREATED)
def create_player_stats(
    payload: PlayerStatCreate,
    service: PlayerStatService = Depends(get_player_stat_service),
    _=Depends(require_permissions("players.edit")),
):
    return service.create(payload)


@router.get("/{player_id}", response_model=PlayerStatOut, status_code=status.HTTP_200_OK)
def get_player_stats(
    player_id: int,
    service: PlayerStatService = Depends(get_player_stat_service),
    _=Depends(require_permissions("players.view")),
):
    return service.get(player_id)


@router.put("/{player_id}", response_model=PlayerStatOut, status_code=status.HTTP_200_OK)
def update_player_stats(
    player_id: int,
    payload: PlayerStatUpdate,
    service: PlayerStatService = Depends(get_player_stat_service),
    _=Depends(require_permissions("players.edit")),
):
    return service.update(player_id, payload)


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player_stats(
    player_id: int,
    service: PlayerStatService = Depends(get_player_stat_service),
    _=Depends(require_permissions("players.delete")),
):
    service.delete(player_id)
