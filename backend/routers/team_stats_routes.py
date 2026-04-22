from fastapi import APIRouter, Depends, HTTPException, status

from data.models import TeamStatCreate, TeamStatOut, TeamStatUpdate
from dependencies import get_team_stat_service
from services import TeamStatService

router = APIRouter(prefix="/team-stats", tags=["team-stats"])


@router.get("/", response_model=list[TeamStatOut])
def list_team_stats(service: TeamStatService = Depends(get_team_stat_service)):
    return service.list()


@router.post("/", response_model=TeamStatOut, status_code=status.HTTP_201_CREATED)
def create_team_stats(payload: TeamStatCreate, service: TeamStatService = Depends(get_team_stat_service)):
    try:
        return service.create(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{team_id}", response_model=TeamStatOut)
def get_team_stats(team_id: int, service: TeamStatService = Depends(get_team_stat_service)):
    team_stats = service.get(team_id)
    if not team_stats:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team stats not found")
    return team_stats


@router.put("/{team_id}", response_model=TeamStatOut)
def update_team_stats(
    team_id: int,
    payload: TeamStatUpdate,
    service: TeamStatService = Depends(get_team_stat_service),
):
    try:
        return service.update(team_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_stats(team_id: int, service: TeamStatService = Depends(get_team_stat_service)):
    try:
        service.delete(team_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
