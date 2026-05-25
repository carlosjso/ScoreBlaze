from datetime import date, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from .domain import MatchStatus
from .tracked_stats import normalize_match_tracked_stats

MAX_MATCH_SCORE = 999
MATCH_COURT_MAX_LENGTH = 80
MATCH_TOURNAMENT_MAX_LENGTH = 100


class MatchBase(BaseModel):
    match_date: date
    start_time: time
    end_time: time
    team_a_id: int
    team_b_id: int
    league_id: Optional[int] = None
    court: Optional[str] = Field(default=None, max_length=MATCH_COURT_MAX_LENGTH)
    tournament: Optional[str] = Field(default=None, max_length=MATCH_TOURNAMENT_MAX_LENGTH)
    tracked_stats: list[str] = Field(default_factory=list)
    status: MatchStatus = MatchStatus.SCHEDULED

    @field_validator("tracked_stats", mode="before")
    @classmethod
    def _normalize_tracked_stats(cls, value: list[str] | None):
        return normalize_match_tracked_stats(value)


class MatchCreate(MatchBase):
    score_team_a: Optional[int] = Field(default=None, ge=0, le=MAX_MATCH_SCORE)
    score_team_b: Optional[int] = Field(default=None, ge=0, le=MAX_MATCH_SCORE)
    winner_team_id: Optional[int] = None
    is_draw: bool = False


class MatchUpdate(BaseModel):
    match_date: date
    start_time: time
    end_time: time
    team_a_id: int
    team_b_id: int
    league_id: Optional[int] = Field(...)
    score_team_a: Optional[int] = Field(..., ge=0, le=MAX_MATCH_SCORE)
    score_team_b: Optional[int] = Field(..., ge=0, le=MAX_MATCH_SCORE)
    winner_team_id: Optional[int] = Field(...)
    is_draw: bool
    court: Optional[str] = Field(..., max_length=MATCH_COURT_MAX_LENGTH)
    tournament: Optional[str] = Field(..., max_length=MATCH_TOURNAMENT_MAX_LENGTH)
    tracked_stats: list[str] = Field(default_factory=list)
    status: MatchStatus

    @field_validator("tracked_stats", mode="before")
    @classmethod
    def _normalize_update_tracked_stats(cls, value: list[str] | None):
        return normalize_match_tracked_stats(value)


class MatchPatch(BaseModel):
    match_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    team_a_id: Optional[int] = None
    team_b_id: Optional[int] = None
    league_id: Optional[int] = None
    score_team_a: Optional[int] = Field(default=None, ge=0, le=MAX_MATCH_SCORE)
    score_team_b: Optional[int] = Field(default=None, ge=0, le=MAX_MATCH_SCORE)
    winner_team_id: Optional[int] = None
    is_draw: Optional[bool] = None
    court: Optional[str] = Field(default=None, max_length=MATCH_COURT_MAX_LENGTH)
    tournament: Optional[str] = Field(default=None, max_length=MATCH_TOURNAMENT_MAX_LENGTH)
    tracked_stats: Optional[list[str]] = None
    status: Optional[MatchStatus] = None


class MatchOut(MatchBase):
    id: int
    score_team_a: Optional[int]
    score_team_b: Optional[int]
    winner_team_id: Optional[int]
    is_draw: bool

    model_config = ConfigDict(from_attributes=True)
