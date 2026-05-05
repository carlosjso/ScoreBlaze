from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .domain import MatchEventStatus, MatchEventType


class MatchEventBase(BaseModel):
    match_id: int
    team_id: int
    player_id: Optional[int] = None
    guest_name: Optional[str] = Field(default=None, max_length=250)
    event_type: MatchEventType
    period: int = Field(..., ge=1)
    elapsed_seconds: int = Field(..., ge=0)
    event_order: int = Field(..., ge=0)
    status: MatchEventStatus = MatchEventStatus.ACTIVE


class MatchEventCreate(MatchEventBase):
    pass


class MatchEventUpdate(BaseModel):
    match_id: int
    team_id: int
    player_id: Optional[int] = None
    guest_name: Optional[str] = Field(default=None, max_length=250)
    event_type: MatchEventType
    period: int = Field(..., ge=1)
    elapsed_seconds: int = Field(..., ge=0)
    event_order: int = Field(..., ge=0)
    status: MatchEventStatus


class MatchEventOut(MatchEventBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
