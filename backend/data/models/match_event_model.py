from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MatchEventBase(BaseModel):
    match_id: int
    team_id: int
    player_id: Optional[int] = None
    guest_name: Optional[str] = Field(default=None, max_length=250)
    event_type: str = Field(..., max_length=30)
    period: int = Field(..., ge=0)
    elapsed_seconds: int = Field(..., ge=0)
    event_order: int = Field(..., ge=0)
    status: str = Field(..., max_length=20)


class MatchEventCreate(MatchEventBase):
    pass


class MatchEventUpdate(BaseModel):
    match_id: Optional[int] = None
    team_id: Optional[int] = None
    player_id: Optional[int] = None
    guest_name: Optional[str] = Field(default=None, max_length=250)
    event_type: Optional[str] = Field(default=None, max_length=30)
    period: Optional[int] = Field(default=None, ge=0)
    elapsed_seconds: Optional[int] = Field(default=None, ge=0)
    event_order: Optional[int] = Field(default=None, ge=0)
    status: Optional[str] = Field(default=None, max_length=20)


class MatchEventOut(MatchEventBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
