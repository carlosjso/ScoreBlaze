from fastapi import APIRouter, Depends, status

from authentication.dependencies import require_any_permission, require_permissions
from authentication.schemas import AuthUserOut

from .dependencies import get_team_membership_service
from .schemas import TeamMembershipCreate, TeamMembershipOut, TeamMembershipUpdate
from .service import TeamMembershipService

router = APIRouter()


@router.get("/", response_model=list[TeamMembershipOut], status_code=status.HTTP_200_OK)
def list_team_memberships(
    service: TeamMembershipService = Depends(get_team_membership_service),
    current_user: AuthUserOut = Depends(require_any_permission("players.view", "teams.view", "teams.manage_roster")),
):
    return service.list(current_user)


@router.post("/", response_model=TeamMembershipOut, status_code=status.HTTP_201_CREATED)
def create_team_membership(
    payload: TeamMembershipCreate,
    service: TeamMembershipService = Depends(get_team_membership_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.manage_roster")),
):
    return service.create(payload, current_user)


@router.get("/{player_id}/{team_id}", response_model=TeamMembershipOut, status_code=status.HTTP_200_OK)
def get_team_membership(
    player_id: int,
    team_id: int,
    service: TeamMembershipService = Depends(get_team_membership_service),
    current_user: AuthUserOut = Depends(require_any_permission("players.view", "teams.view", "teams.manage_roster")),
):
    return service.get(player_id, team_id, current_user)


@router.put("/{player_id}/{team_id}", response_model=TeamMembershipOut, status_code=status.HTTP_200_OK)
def update_team_membership(
    player_id: int,
    team_id: int,
    payload: TeamMembershipUpdate,
    service: TeamMembershipService = Depends(get_team_membership_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.manage_roster")),
):
    return service.update(player_id, team_id, payload, current_user)


@router.delete("/{player_id}/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team_membership(
    player_id: int,
    team_id: int,
    service: TeamMembershipService = Depends(get_team_membership_service),
    current_user: AuthUserOut = Depends(require_permissions("teams.manage_roster")),
):
    service.delete(player_id, team_id, current_user)
