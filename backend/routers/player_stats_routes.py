from fastapi import APIRouter, Depends, HTTPException, status

from data.models import PlayerStatCreate, PlayerStatOut, PlayerStatUpdate
from dependencies import get_player_stat_service
from services import PlayerStatService

router = APIRouter(prefix="/player-stats", tags=["player-stats"])


@router.get("/", response_model=list[PlayerStatOut])
def list_player_stats(service: PlayerStatService = Depends(get_player_stat_service)):
    return service.list()


@router.post("/", response_model=PlayerStatOut, status_code=status.HTTP_201_CREATED)
def create_player_stats(payload: PlayerStatCreate, service: PlayerStatService = Depends(get_player_stat_service)):
    try:
        return service.create(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{player_id}", response_model=PlayerStatOut)
def get_player_stats(player_id: int, service: PlayerStatService = Depends(get_player_stat_service)):
    player_stats = service.get(player_id)
    if not player_stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player stats not found")
    return player_stats


@router.put("/{player_id}", response_model=PlayerStatOut)
def update_player_stats(
    player_id: int,
    payload: PlayerStatUpdate,
    service: PlayerStatService = Depends(get_player_stat_service),
):
    try:
        return service.update(player_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player_stats(player_id: int, service: PlayerStatService = Depends(get_player_stat_service)):
    try:
        service.delete(player_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
