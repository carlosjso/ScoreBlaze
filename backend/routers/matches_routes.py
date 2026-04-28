from fastapi import APIRouter, Depends, HTTPException, status

from data.models import MatchCreate, MatchOut, MatchUpdate, ScoreboardEventCreate, ScoreboardSnapshotOut
from dependencies import get_match_service, get_scoreboard_service
from services import MatchService, ScoreboardService

router = APIRouter(prefix="/matches", tags=["matches"])


@router.get("/", response_model=list[MatchOut])
def list_matches(service: MatchService = Depends(get_match_service)):
    return service.list()


@router.post("/", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(payload: MatchCreate, service: MatchService = Depends(get_match_service)):
    try:
        return service.create(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{match_id}", response_model=MatchOut)
def get_match(match_id: int, service: MatchService = Depends(get_match_service)):
    match = service.get(match_id)
    if not match:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match not found")
    return match


@router.get("/{match_id}/scoreboard", response_model=ScoreboardSnapshotOut)
def get_match_scoreboard(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
):
    try:
        return service.get_snapshot(match_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


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
    try:
        return service.record_event(match_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{match_id}/scoreboard/undo", response_model=ScoreboardSnapshotOut)
def undo_match_scoreboard_event(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
):
    try:
        return service.undo_last_event(match_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{match_id}/scoreboard/reset", response_model=ScoreboardSnapshotOut)
def reset_match_scoreboard(
    match_id: int,
    service: ScoreboardService = Depends(get_scoreboard_service),
):
    try:
        return service.reset(match_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.put("/{match_id}", response_model=MatchOut)
def update_match(
    match_id: int,
    payload: MatchUpdate,
    service: MatchService = Depends(get_match_service),
):
    try:
        return service.update(match_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(match_id: int, service: MatchService = Depends(get_match_service)):
    try:
        service.delete(match_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
