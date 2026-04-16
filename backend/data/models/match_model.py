from datetime import date, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class MatchBase(BaseModel):
    match_date: date
    start_time: time
    end_time: time
    team_a_id: int
    team_b_id: int
    court: Optional[str] = Field(default=None, max_length=250)
    tournament: Optional[str] = Field(default=None, max_length=250)


class MatchCreate(MatchBase):
    score_team_a: Optional[int] = Field(default=None, ge=0)
    score_team_b: Optional[int] = Field(default=None, ge=0)
    winner_team_id: Optional[int] = None
    is_draw: bool = False


class MatchUpdate(BaseModel):
    match_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    team_a_id: Optional[int] = None
    team_b_id: Optional[int] = None
    score_team_a: Optional[int] = Field(default=None, ge=0)
    score_team_b: Optional[int] = Field(default=None, ge=0)
    winner_team_id: Optional[int] = None
    is_draw: Optional[bool] = None
    court: Optional[str] = Field(default=None, max_length=250)
    tournament: Optional[str] = Field(default=None, max_length=250)


class MatchOut(MatchBase):
    id: int
    score_team_a: Optional[int]
    score_team_b: Optional[int]
    winner_team_id: Optional[int]
    is_draw: bool

    model_config = ConfigDict(from_attributes=True)
