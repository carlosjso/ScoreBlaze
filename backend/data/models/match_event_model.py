from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

MatchEventType = Literal["point_1", "point_2", "point_3", "miss", "foul", "rebound", "assist"]
MatchEventStatus = Literal["active", "voided"]


class MatchEventBase(BaseModel):
    match_id: int
    team_id: int
    player_id: Optional[int] = None
    guest_name: Optional[str] = Field(default=None, max_length=250)
    event_type: MatchEventType
    period: int = Field(..., ge=1)
    elapsed_seconds: int = Field(..., ge=0)
    event_order: int = Field(..., ge=0)
    status: MatchEventStatus = "active"


class MatchEventCreate(MatchEventBase):
    pass


class MatchEventUpdate(BaseModel):
    match_id: Optional[int] = None
    team_id: Optional[int] = None
    player_id: Optional[int] = None
    guest_name: Optional[str] = Field(default=None, max_length=250)
    event_type: Optional[MatchEventType] = None
    period: Optional[int] = Field(default=None, ge=1)
    elapsed_seconds: Optional[int] = Field(default=None, ge=0)
    event_order: Optional[int] = Field(default=None, ge=0)
    status: Optional[MatchEventStatus] = None


class MatchEventOut(MatchEventBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
