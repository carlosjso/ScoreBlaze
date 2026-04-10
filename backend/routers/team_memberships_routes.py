from fastapi import APIRouter, Depends, HTTPException, status

from data.models import TeamMembershipCreate, TeamMembershipOut, TeamMembershipUpdate
from dependencies import get_team_membership_service
from services import TeamMembershipService

router = APIRouter(prefix="/team-memberships", tags=["team-memberships"])


@router.get("/", response_model=list[TeamMembershipOut])
def list_team_memberships(
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    return service.list()


@router.post("/", response_model=TeamMembershipOut, status_code=status.HTTP_201_CREATED)
def create_team_membership(
    payload: TeamMembershipCreate,
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    try:
        return service.create(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{player_id}/{team_id}", response_model=TeamMembershipOut)
def get_team_membership(
    player_id: int,
    team_id: int,
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    relation = service.get(player_id, team_id)
    if not relation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Relation not found")
    return relation


@router.put("/{player_id}/{team_id}", response_model=TeamMembershipOut)
def update_team_membership(
    player_id: int,
    team_id: int,
    payload: TeamMembershipUpdate,
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    try:
        return service.update(player_id, team_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.delete("/{player_id}/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_membership(
    player_id: int,
    team_id: int,
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    try:
        service.delete(player_id, team_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
