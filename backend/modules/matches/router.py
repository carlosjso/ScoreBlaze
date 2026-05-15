from fastapi import APIRouter, Depends, Query, status

from authentication.dependencies import require_any_permission, require_permissions
from modules.matches.dependencies import get_match_service
from modules.scoreboard.schemas import (
    ScoreboardEventCreate,
    ScoreboardPlayerParticipationUpdate,
    ScoreboardSnapshotOut,
)
from modules.scoreboard.dependencies import get_scoreboard_service
from modules.scoreboard.service import ScoreboardService

from .schemas import MatchCreate, MatchOut, MatchPatch, MatchUpdate
from .service import MatchService

router = APIRouter()


@router.get("/", response_model=list[MatchOut], status_code=status.HTTP_200_OK)
def list_matches(
    league_id: int | None = Query(default=None, ge=1),
    service: MatchService = Depends(get_match_service),
    _=Depends(require_permissions("quick_match.view")),
):
    return service.list(league_id=league_id)


@router.post("/", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(
    payload: MatchCreate,
    service: MatchService = Depends(get_match_service),
    _=Depends(require_permissions("quick_match.create")),
):
    return service.create(payload)


@router.get("/{match_id}", response_model=MatchOut, status_code=status.HTTP_200_OK)
def get_match(
    match_id: int,
    service: MatchService = Depends(get_match_service),
    _=Depends(require_permissions("quick_match.view")),
):
    return service.get(match_id)


@router.get("/{match_id}/scoreboard", response_model=ScoreboardSnapshotOut, status_code=status.HTTP_200_OK)
def get_match_scoreboard(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
    _=Depends(require_any_permission("quick_match.view", "quick_match.view_stats")),
):
    return service.get_snapshot(match_id)


@router.post(
    "/{match_id}/scoreboard/events",
    response_model=ScoreboardSnapshotOut,
    status_code=status.HTTP_201_CREATED,
)
def create_match_scoreboard_event(
    match_id: int,
    payload: ScoreboardEventCreate,
    service: ScoreboardService = Depends(get_scoreboard_service),
    _=Depends(require_permissions("quick_match.edit")),
):
    return service.record_event(match_id, payload)


@router.patch(
    "/{match_id}/scoreboard/players/{player_id}",
    response_model=ScoreboardSnapshotOut,
    status_code=status.HTTP_200_OK,
)
def update_match_scoreboard_player_participation(
    match_id: int,
    player_id: int,
    payload: ScoreboardPlayerParticipationUpdate,
    service: ScoreboardService = Depends(get_scoreboard_service),
    _=Depends(require_permissions("quick_match.edit")),
):
    return service.update_player_participation(match_id, player_id, payload)


@router.post("/{match_id}/scoreboard/undo", response_model=ScoreboardSnapshotOut, status_code=status.HTTP_200_OK)
def undo_match_scoreboard_event(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
    _=Depends(require_permissions("quick_match.edit")),
):
    return service.undo_last_event(match_id)


@router.post("/{match_id}/scoreboard/reset", response_model=ScoreboardSnapshotOut, status_code=status.HTTP_200_OK)
def reset_match_scoreboard(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
    _=Depends(require_permissions("quick_match.edit")),
):
    return service.reset(match_id)


@router.put("/{match_id}", response_model=MatchOut, status_code=status.HTTP_200_OK)
def update_match(
    match_id: int,
    payload: MatchUpdate,
    service: MatchService = Depends(get_match_service),
    _=Depends(require_permissions("quick_match.edit")),
):
    return service.update(match_id, payload)


@router.patch("/{match_id}", response_model=MatchOut, status_code=status.HTTP_200_OK)
def patch_match(
    match_id: int,
    payload: MatchPatch,
    service: MatchService = Depends(get_match_service),
    _=Depends(require_permissions("quick_match.edit")),
):
    return service.patch(match_id, payload)


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(
    match_id: int,
    service: MatchService = Depends(get_match_service),
    _=Depends(require_permissions("quick_match.delete")),
):
    service.delete(match_id)
