from fastapi import APIRouter, Depends, HTTPException, status

from data.models import PlayerCreate, PlayerOut, PlayerUpdate, TeamOut
from dependencies import get_player_service, get_team_membership_service, get_team_service
from services import PlayerService, TeamMembershipService, TeamService

router = APIRouter(prefix="/players", tags=["players"])


@router.get("/", response_model=list[PlayerOut])
def list_players(service: PlayerService = Depends(get_player_service)):
    return service.list()


@router.post("/", response_model=PlayerOut, status_code=status.HTTP_201_CREATED)
def create_player(payload: PlayerCreate, service: PlayerService = Depends(get_player_service)):
    try:
        return service.create(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{player_id}", response_model=PlayerOut)
def get_player(player_id: int, service: PlayerService = Depends(get_player_service)):
    player = service.get(player_id)
    if not player:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return player


@router.put("/{player_id}", response_model=PlayerOut)
def update_player(
    player_id: int,
    payload: PlayerUpdate,
    service: PlayerService = Depends(get_player_service),
):
    try:
        return service.update(player_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(player_id: int, service: PlayerService = Depends(get_player_service)):
    try:
        service.delete(player_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{player_id}/teams", response_model=list[TeamOut])
def list_player_teams(
    player_id: int,
    membership_service: TeamMembershipService = Depends(get_team_membership_service),
    team_service: TeamService = Depends(get_team_service),
):
    try:
        relations = membership_service.list_by_player(player_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    teams: list[TeamOut] = []
    for relation in relations:
        team = team_service.get(relation.team_id)
        if team:
            teams.append(team)
    return teams
