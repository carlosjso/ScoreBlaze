from fastapi import APIRouter, Depends, status

from authentication.dependencies import require_permissions

from .dependencies import get_team_stat_service
from .schemas import TeamStatCreate, TeamStatOut, TeamStatUpdate
from .team_stat_service import TeamStatService

router = APIRouter()


@router.get("/", response_model=list[TeamStatOut], status_code=status.HTTP_200_OK)
def list_team_stats(
    service: TeamStatService = Depends(get_team_stat_service),
    _=Depends(require_permissions("teams.view")),
):
    return service.list()


@router.post("/", response_model=TeamStatOut, status_code=status.HTTP_201_CREATED)
def create_team_stats(
    payload: TeamStatCreate,
    service: TeamStatService = Depends(get_team_stat_service),
    _=Depends(require_permissions("teams.edit")),
):
    return service.create(payload)


@router.get("/{team_id}", response_model=TeamStatOut, status_code=status.HTTP_200_OK)
def get_team_stats(
    team_id: int,
    service: TeamStatService = Depends(get_team_stat_service),
    _=Depends(require_permissions("teams.view")),
):
    return service.get(team_id)


@router.put("/{team_id}", response_model=TeamStatOut, status_code=status.HTTP_200_OK)
def update_team_stats(
    team_id: int,
    payload: TeamStatUpdate,
    service: TeamStatService = Depends(get_team_stat_service),
    _=Depends(require_permissions("teams.edit")),
):
    return service.update(team_id, payload)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_stats(
    team_id: int,
    service: TeamStatService = Depends(get_team_stat_service),
    _=Depends(require_permissions("teams.delete")),
):
    service.delete(team_id)
