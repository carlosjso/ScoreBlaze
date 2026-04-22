from fastapi import APIRouter, Depends, HTTPException, status

from data.models import MatchEventCreate, MatchEventOut, MatchEventUpdate
from dependencies import get_match_event_service
from services import MatchEventService

router = APIRouter(prefix="/match-events", tags=["match-events"])


@router.get("/", response_model=list[MatchEventOut])
def list_match_events(service: MatchEventService = Depends(get_match_event_service)):
    return service.list()


@router.post("/", response_model=MatchEventOut, status_code=status.HTTP_201_CREATED)
def create_match_event(payload: MatchEventCreate, service: MatchEventService = Depends(get_match_event_service)):
    try:
        return service.create(payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/{event_id}", response_model=MatchEventOut)
def get_match_event(event_id: int, service: MatchEventService = Depends(get_match_event_service)):
    match_event = service.get(event_id)
    if not match_event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match event not found")
    return match_event


@router.put("/{event_id}", response_model=MatchEventOut)
def update_match_event(
    event_id: int,
    payload: MatchEventUpdate,
    service: MatchEventService = Depends(get_match_event_service),
):
    try:
        return service.update(event_id, payload)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match_event(event_id: int, service: MatchEventService = Depends(get_match_event_service)):
    try:
        service.delete(event_id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
