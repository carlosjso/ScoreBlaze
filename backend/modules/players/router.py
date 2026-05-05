from fastapi import APIRouter, Depends, status

from modules.teams.schemas import TeamOut

from .dependencies import get_player_service
from .schemas import PlayerCreate, PlayerOut, PlayerUpdate
from .service import PlayerService

router = APIRouter()


@router.get("/", response_model=list[PlayerOut], status_code=status.HTTP_200_OK)
def list_players(service: PlayerService = Depends(get_player_service)):
    return service.list()


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
