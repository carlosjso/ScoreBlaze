from datetime import datetime

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
    matches_played: int = Field(..., ge=0)
    total_points: int = Field(..., ge=0)
    made_1pt: int = Field(..., ge=0)
    made_2pt: int = Field(..., ge=0)
    made_3pt: int = Field(..., ge=0)
    missed_shots: int = Field(..., ge=0)
    total_assists: int = Field(..., ge=0)
    total_rebounds: int = Field(..., ge=0)
    total_fouls: int = Field(..., ge=0)


class PlayerStatOut(PlayerStatBase):
    player_id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


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
    matches_played: int = Field(..., ge=0)
    wins: int = Field(..., ge=0)
    losses: int = Field(..., ge=0)
    draws: int = Field(..., ge=0)
    points_for: int = Field(..., ge=0)
    points_against: int = Field(..., ge=0)
    points_difference: int
    standings_points: int = Field(..., ge=0)
    total_team_fouls: int = Field(..., ge=0)


class TeamStatOut(TeamStatBase):
    team_id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
