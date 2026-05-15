from typing import Literal

from fastapi import APIRouter, Depends, Query, status

from authentication.dependencies import (
    has_required_permission,
    require_authenticated_user,
    require_permissions,
)
from authentication.schemas import AuthUserOut
from core.exceptions import ForbiddenException
from core.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE

from modules.teams.schemas import TeamOut

from .dependencies import get_player_service
from .schemas import PaginatedPlayersTableOut, PlayerCreate, PlayerOut, PlayerUpdate
from .service import PlayerService

router = APIRouter()


def _permission_sets(current_user: AuthUserOut) -> tuple[set[str], set[str]]:
    current_roles = {role.strip().lower() for role in current_user.roles}
    current_permissions = {permission.strip().lower() for permission in current_user.permissions}
    return current_roles, current_permissions


def _has_permission(current_user: AuthUserOut, permission: str) -> bool:
    current_roles, current_permissions = _permission_sets(current_user)
    return has_required_permission(current_roles, current_permissions, {permission})


def _ensure_can_assign_player_teams(current_user: AuthUserOut) -> None:
    if _has_permission(current_user, "players.assign_team"):
        return
    raise ForbiddenException("No tienes permisos para asignar equipos a jugadores.")


def _ensure_can_update_player(current_user: AuthUserOut) -> None:
    if _has_permission(current_user, "players.edit") or _has_permission(current_user, "players.assign_team"):
        return
    raise ForbiddenException("No tienes permisos para realizar esta accion.")


@router.get("/", response_model=list[PlayerOut], status_code=status.HTTP_200_OK)
def list_players(
    service: PlayerService = Depends(get_player_service),
    _=Depends(require_permissions("players.view")),
):
    return service.list()


@router.get("/table", response_model=PaginatedPlayersTableOut, status_code=status.HTTP_200_OK)
def list_players_table(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    search: str = Query(default=""),
    team_filter: str = Query(default="all", pattern=r"^(all|none|\d+)$"),
    sort_key: Literal["id", "name"] = Query(default="id"),
    sort_dir: Literal["asc", "desc"] = Query(default="asc"),
    service: PlayerService = Depends(get_player_service),
    _=Depends(require_permissions("players.view")),
):
    return service.list_table(
        page=page,
        page_size=page_size,
        search=search,
        team_filter=team_filter,
        sort_key=sort_key,
        sort_dir=sort_dir,
    )


@router.post("/", response_model=PlayerOut, status_code=status.HTTP_201_CREATED)
def create_player(
    payload: PlayerCreate,
    service: PlayerService = Depends(get_player_service),
    current_user: AuthUserOut = Depends(require_permissions("players.create")),
):
    if payload.team_ids:
        _ensure_can_assign_player_teams(current_user)
    return service.create(payload)


@router.get("/{player_id}", response_model=PlayerOut, status_code=status.HTTP_200_OK)
def get_player(
    player_id: int,
    service: PlayerService = Depends(get_player_service),
    _=Depends(require_permissions("players.view")),
):
    return service.get(player_id)


@router.put("/{player_id}", response_model=PlayerOut, status_code=status.HTTP_200_OK)
def update_player(
    player_id: int,
    payload: PlayerUpdate,
    service: PlayerService = Depends(get_player_service),
    current_user: AuthUserOut = Depends(require_authenticated_user),
):
    _ensure_can_update_player(current_user)
    if not _has_permission(current_user, "players.edit"):
        player = service.get(player_id)
        current_phone = None if player.phone is None else str(player.phone)
        if (
            payload.name != player.name
            or payload.email != player.email
            or payload.phone != current_phone
            or payload.photo_base64 != player.photo_base64
        ):
            raise ForbiddenException("No tienes permisos para editar jugadores.")

    return service.update(player_id, payload)


@router.delete("/{player_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_player(
    player_id: int,
    service: PlayerService = Depends(get_player_service),
    _=Depends(require_permissions("players.delete")),
):
    service.delete(player_id)


@router.get("/{player_id}/teams", response_model=list[TeamOut], status_code=status.HTTP_200_OK)
def list_player_teams(
    player_id: int,
    service: PlayerService = Depends(get_player_service),
    _=Depends(require_permissions("players.view")),
):
    return service.list_teams(player_id)
