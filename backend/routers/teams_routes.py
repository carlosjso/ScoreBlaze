from fastapi import APIRouter, Depends, HTTPException, status

from data.models import PlayerOut, TeamCreate, TeamOut, TeamUpdate
from dependencies import get_player_service, get_team_membership_service, get_team_service
from services import PlayerService, TeamMembershipService, TeamService

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("/", response_model=list[TeamOut])
def list_teams(service: TeamService = Depends(get_team_service)):
    return service.list()


@router.post("/", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
def create_team(payload: TeamCreate, service: TeamService = Depends(get_team_service)):
    try:
        return service.create(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{team_id}", response_model=TeamOut)
def get_team(team_id: int, service: TeamService = Depends(get_team_service)):
    team = service.get(team_id)
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    return team


@router.put("/{team_id}", response_model=TeamOut)
def update_team(
    team_id: int,
    payload: TeamUpdate,
    service: TeamService = Depends(get_team_service),
):
    try:
        return service.update(team_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(team_id: int, service: TeamService = Depends(get_team_service)):
    try:
        service.delete(team_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{team_id}/players", response_model=list[PlayerOut])
def list_team_players(
    team_id: int,
    membership_service: TeamMembershipService = Depends(get_team_membership_service),
    player_service: PlayerService = Depends(get_player_service),
):
    try:
        relations = membership_service.list_by_team(team_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    players: list[PlayerOut] = []
    for relation in relations:
        player = player_service.get(relation.player_id)
        if player:
            players.append(player)
    return players
