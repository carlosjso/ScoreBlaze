from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PlayerStatBase(BaseModel):
    matches_played: int = Field(default=0, ge=0)
    total_points: int = Field(default=0, ge=0)
    made_1pt: int = Field(default=0, ge=0)
    made_2pt: int = Field(default=0, ge=0)
    made_3pt: int = Field(default=0, ge=0)
    missed_shots: int = Field(default=0, ge=0)
    total_assists: int = Field(default=0, ge=0)
    total_rebounds: int = Field(default=0, ge=0)
    total_fouls: int = Field(default=0, ge=0)


class PlayerStatCreate(PlayerStatBase):
    player_id: int


class PlayerStatUpdate(BaseModel):
    matches_played: Optional[int] = Field(default=None, ge=0)
    total_points: Optional[int] = Field(default=None, ge=0)
    made_1pt: Optional[int] = Field(default=None, ge=0)
    made_2pt: Optional[int] = Field(default=None, ge=0)
    made_3pt: Optional[int] = Field(default=None, ge=0)
    missed_shots: Optional[int] = Field(default=None, ge=0)
    total_assists: Optional[int] = Field(default=None, ge=0)
    total_rebounds: Optional[int] = Field(default=None, ge=0)
    total_fouls: Optional[int] = Field(default=None, ge=0)


class PlayerStatOut(PlayerStatBase):
    player_id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
