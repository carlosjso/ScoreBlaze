from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .domain import LeagueStatus

LEAGUE_NAME_MAX_LENGTH = 80
LEAGUE_CATEGORY_MAX_LENGTH = 80
LEAGUE_RESPONSIBLE_NAME_MAX_LENGTH = 100
LEAGUE_RESPONSIBLE_EMAIL_MAX_LENGTH = 120
LEAGUE_TRACKED_STAT_MAX_LENGTH = 40


class LeagueBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=LEAGUE_NAME_MAX_LENGTH)
    responsible_name: str = Field(..., min_length=1, max_length=LEAGUE_RESPONSIBLE_NAME_MAX_LENGTH)
    responsible_email: EmailStr
    category: str = Field(..., min_length=1, max_length=LEAGUE_CATEGORY_MAX_LENGTH)
    status: LeagueStatus = LeagueStatus.PENDING
    start_date: date
    end_date: date
    tracked_stats: list[str] = Field(default_factory=list, max_length=12)


class LeagueCreate(LeagueBase):
    logo_base64: Optional[str] = Field(default=None, description="Optional league logo encoded in Base64.")
    team_ids: list[int] = Field(default_factory=list)


class LeagueUpdate(LeagueBase):
    logo_base64: Optional[str] = Field(..., description="Optional league logo encoded in Base64.")
    team_ids: list[int]


class LeagueTeamAssignmentsUpdate(BaseModel):
    team_ids: list[int]


class LeagueOut(LeagueBase):
    id: int
    logo_base64: Optional[str] = Field(default=None, description="Optional league logo encoded in Base64.")
    team_ids: list[int]

    model_config = ConfigDict(from_attributes=True)


class LeagueTeamSummaryOut(BaseModel):
    id: int
    name: str
    logo_base64: Optional[str] = None
    responsible_name: str
    responsible_email: str
    player_count: int
    players_label: str


class LeagueDetailOut(LeagueOut):
    teams: list[LeagueTeamSummaryOut]
    matches_count: int


class LeagueTableRowOut(BaseModel):
    id: int
    name: str
    category: str
    status: LeagueStatus
    responsible_name: str
    responsible_email: str
    start_date: date
    end_date: date
    logo_base64: Optional[str] = None
    tracked_stats: list[str]
    team_ids: list[int]
    team_count: int


class PaginatedLeaguesTableOut(BaseModel):
    items: list[LeagueTableRowOut]
    page: int
    page_size: int
    total_items: int
    total_pages: int


class LeagueTeamLeaderOut(BaseModel):
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    value: int = 0


class LeaguePlayerLeaderOut(BaseModel):
    player_id: Optional[int] = None
    player_name: Optional[str] = None
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    value: int = 0


class LeagueStatsOverviewOut(BaseModel):
    teams_count: int
    total_matches: int
    scheduled_matches: int
    live_matches: int
    finished_matches: int
    champion: Optional[LeagueTeamLeaderOut] = None


class LeagueTeamLeadersOut(BaseModel):
    top_offense: Optional[LeagueTeamLeaderOut] = None
    best_defense: Optional[LeagueTeamLeaderOut] = None
    most_wins: Optional[LeagueTeamLeaderOut] = None


class LeaguePlayerLeadersOut(BaseModel):
    top_scorer: Optional[LeaguePlayerLeaderOut] = None
    top_three_point: Optional[LeaguePlayerLeaderOut] = None
    top_two_point: Optional[LeaguePlayerLeaderOut] = None
    top_free_throw: Optional[LeaguePlayerLeaderOut] = None
    top_assist: Optional[LeaguePlayerLeaderOut] = None
    top_rebound: Optional[LeaguePlayerLeaderOut] = None
    top_foul: Optional[LeaguePlayerLeaderOut] = None


class LeagueStandingRowOut(BaseModel):
    position: int
    team_id: int
    team_name: str
    matches_played: int
    wins: int
    losses: int
    draws: int
    points_for: int
    points_against: int
    points_difference: int
    standings_points: int
    total_team_fouls: int


class LeaguePlayerRankingRowOut(BaseModel):
    position: int
    player_id: int
    player_name: str
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    matches_played: int
    total_points: int
    made_1pt: int
    made_2pt: int
    made_3pt: int
    missed_shots: int
    total_assists: int
    total_rebounds: int
    total_fouls: int


class LeagueStatsSnapshotOut(BaseModel):
    league_id: int
    league_name: str
    league_status: LeagueStatus
    tracked_stats: list[str]
    overview: LeagueStatsOverviewOut
    team_leaders: LeagueTeamLeadersOut
    player_leaders: LeaguePlayerLeadersOut
    standings: list[LeagueStandingRowOut]
    player_rankings: list[LeaguePlayerRankingRowOut]
    updated_at: datetime
