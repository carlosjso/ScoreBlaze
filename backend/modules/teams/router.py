from fastapi import APIRouter, Depends, status

from modules.players.schemas import PlayerOut

from .dependencies import get_team_service
from .schemas import TeamCreate, TeamOut, TeamUpdate
from .service import TeamService

router = APIRouter()


@router.get("/", response_model=list[TeamOut], status_code=status.HTTP_200_OK)
def list_teams(service: TeamService = Depends(get_team_service)):
    return service.list()


@router.post("/", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
def create_team(payload: TeamCreate, service: TeamService = Depends(get_team_service)):
    return service.create(payload)


@router.get("/{team_id}", response_model=TeamOut, status_code=status.HTTP_200_OK)
def get_team(team_id: int, service: TeamService = Depends(get_team_service)):
    return service.get(team_id)


@router.put("/{team_id}", response_model=TeamOut, status_code=status.HTTP_200_OK)
def update_team(
    team_id: int,
    payload: TeamUpdate,
    service: TeamService = Depends(get_team_service),
):
    return service.update(team_id, payload)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(team_id: int, service: TeamService = Depends(get_team_service)):
    service.delete(team_id)


@router.get("/{team_id}/players", response_model=list[PlayerOut], status_code=status.HTTP_200_OK)
def list_team_players(
    team_id: int,
    service: TeamService = Depends(get_team_service),
):
    return service.list_players(team_id)
