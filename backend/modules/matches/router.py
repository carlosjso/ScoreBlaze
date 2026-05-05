from fastapi import APIRouter, Depends, status

from modules.matches.dependencies import get_match_service
from modules.scoreboard.schemas import ScoreboardEventCreate, ScoreboardSnapshotOut
from modules.scoreboard.dependencies import get_scoreboard_service
from modules.scoreboard.service import ScoreboardService

from .schemas import MatchCreate, MatchOut, MatchPatch, MatchUpdate
from .service import MatchService

router = APIRouter()


@router.get("/", response_model=list[MatchOut], status_code=status.HTTP_200_OK)
def list_matches(service: MatchService = Depends(get_match_service)):
    return service.list()


@router.post("/", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(payload: MatchCreate, service: MatchService = Depends(get_match_service)):
    return service.create(payload)


@router.get("/{match_id}", response_model=MatchOut, status_code=status.HTTP_200_OK)
def get_match(match_id: int, service: MatchService = Depends(get_match_service)):
    return service.get(match_id)


@router.get("/{match_id}/scoreboard", response_model=ScoreboardSnapshotOut, status_code=status.HTTP_200_OK)
def get_match_scoreboard(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
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
):
    return service.record_event(match_id, payload)


@router.post("/{match_id}/scoreboard/undo", response_model=ScoreboardSnapshotOut, status_code=status.HTTP_200_OK)
def undo_match_scoreboard_event(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
):
    return service.undo_last_event(match_id)


@router.post("/{match_id}/scoreboard/reset", response_model=ScoreboardSnapshotOut, status_code=status.HTTP_200_OK)
def reset_match_scoreboard(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
):
    return service.reset(match_id)


@router.put("/{match_id}", response_model=MatchOut, status_code=status.HTTP_200_OK)
def update_match(
    match_id: int,
    payload: MatchUpdate,
    service: MatchService = Depends(get_match_service),
):
    return service.update(match_id, payload)


@router.patch("/{match_id}", response_model=MatchOut, status_code=status.HTTP_200_OK)
def patch_match(
    match_id: int,
    payload: MatchPatch,
    service: MatchService = Depends(get_match_service),
):
    return service.patch(match_id, payload)


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(match_id: int, service: MatchService = Depends(get_match_service)):
    service.delete(match_id)
