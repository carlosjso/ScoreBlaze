from fastapi import APIRouter, Depends, status

from authentication.dependencies import require_permissions

from .dependencies import get_match_event_service
from .schemas import MatchEventCreate, MatchEventOut, MatchEventUpdate
from .service import MatchEventService

router = APIRouter()


@router.get("/", response_model=list[MatchEventOut], status_code=status.HTTP_200_OK)
def list_match_events(
    service: MatchEventService = Depends(get_match_event_service),
    _=Depends(require_permissions("quick_match.view")),
):
    return service.list()


@router.post("/", response_model=MatchEventOut, status_code=status.HTTP_201_CREATED)
def create_match_event(
    payload: MatchEventCreate,
    service: MatchEventService = Depends(get_match_event_service),
    _=Depends(require_permissions("quick_match.edit")),
):
    return service.create(payload)


@router.get("/{event_id}", response_model=MatchEventOut, status_code=status.HTTP_200_OK)
def get_match_event(
    event_id: int,
    service: MatchEventService = Depends(get_match_event_service),
    _=Depends(require_permissions("quick_match.view")),
):
    return service.get(event_id)


@router.put("/{event_id}", response_model=MatchEventOut, status_code=status.HTTP_200_OK)
def update_match_event(
    event_id: int,
    payload: MatchEventUpdate,
    service: MatchEventService = Depends(get_match_event_service),
    _=Depends(require_permissions("quick_match.edit")),
):
    return service.update(event_id, payload)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match_event(
    event_id: int,
    service: MatchEventService = Depends(get_match_event_service),
    _=Depends(require_permissions("quick_match.delete")),
):
    service.delete(event_id)
