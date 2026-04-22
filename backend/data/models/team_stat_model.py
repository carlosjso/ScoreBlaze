from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TeamStatBase(BaseModel):
    matches_played: int = Field(default=0, ge=0)
    wins: int = Field(default=0, ge=0)
    losses: int = Field(default=0, ge=0)
    draws: int = Field(default=0, ge=0)
    points_for: int = Field(default=0, ge=0)
    points_against: int = Field(default=0, ge=0)
    points_difference: int = 0
    standings_points: int = Field(default=0, ge=0)
    total_team_fouls: int = Field(default=0, ge=0)


class TeamStatCreate(TeamStatBase):
    team_id: int


class TeamStatUpdate(BaseModel):
    matches_played: Optional[int] = Field(default=None, ge=0)
    wins: Optional[int] = Field(default=None, ge=0)
    losses: Optional[int] = Field(default=None, ge=0)
    draws: Optional[int] = Field(default=None, ge=0)
    points_for: Optional[int] = Field(default=None, ge=0)
    points_against: Optional[int] = Field(default=None, ge=0)
    points_difference: Optional[int] = None
    standings_points: Optional[int] = Field(default=None, ge=0)
    total_team_fouls: Optional[int] = Field(default=None, ge=0)


class TeamStatOut(TeamStatBase):
    team_id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
