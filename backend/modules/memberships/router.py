from fastapi import APIRouter, Depends, status

from .dependencies import get_team_membership_service
from .schemas import TeamMembershipCreate, TeamMembershipOut, TeamMembershipUpdate
from .service import TeamMembershipService

router = APIRouter()


@router.get("/", response_model=list[TeamMembershipOut], status_code=status.HTTP_200_OK)
def list_team_memberships(
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    return service.list()


@router.post("/", response_model=TeamMembershipOut, status_code=status.HTTP_201_CREATED)
def create_team_membership(
    payload: TeamMembershipCreate,
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    return service.create(payload)


@router.get("/{player_id}/{team_id}", response_model=TeamMembershipOut, status_code=status.HTTP_200_OK)
def get_team_membership(
    player_id: int,
    team_id: int,
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    return service.get(player_id, team_id)


@router.put("/{player_id}/{team_id}", response_model=TeamMembershipOut, status_code=status.HTTP_200_OK)
def update_team_membership(
    player_id: int,
    team_id: int,
    payload: TeamMembershipUpdate,
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    return service.update(player_id, team_id, payload)


@router.delete("/{player_id}/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_membership(
    player_id: int,
    team_id: int,
    service: TeamMembershipService = Depends(get_team_membership_service),
):
    service.delete(player_id, team_id)
