from __future__ import annotations

from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .domain import (
    LeagueCompetitionType,
    LeagueFinalPhaseFormat,
    LeagueFinalPhasePreset,
    LeagueGroupStageMode,
    LeagueGroupWildcardRankingMetric,
    LeagueRegularSeasonFormat,
    LeagueStandingsTiebreaker,
    LeagueStatus,
)

LEAGUE_NAME_MAX_LENGTH = 80
LEAGUE_CATEGORY_MAX_LENGTH = 80
LEAGUE_RESPONSIBLE_NAME_MAX_LENGTH = 100
LEAGUE_RESPONSIBLE_EMAIL_MAX_LENGTH = 120
LEAGUE_FINAL_PHASE_QUALIFIED_TEAMS_MIN = 2
LEAGUE_FINAL_PHASE_QUALIFIED_TEAMS_MAX = 32
LEAGUE_GROUP_STAGE_GROUP_KEY_MAX_LENGTH = 20
LEAGUE_GROUP_STAGE_GROUP_NAME_MAX_LENGTH = 50


class LeagueGroupStageGroupConfig(BaseModel):
    key: str = Field(..., min_length=1, max_length=LEAGUE_GROUP_STAGE_GROUP_KEY_MAX_LENGTH)
    name: str = Field(..., min_length=1, max_length=LEAGUE_GROUP_STAGE_GROUP_NAME_MAX_LENGTH)
    team_ids: list[int] = Field(default_factory=list)

    @field_validator("key", "name", mode="before")
    @classmethod
    def _strip_text_fields(cls, value: str):
        if not isinstance(value, str):
            return value
        return " ".join(value.split()).strip()


class LeagueGroupStageConfig(BaseModel):
    mode: LeagueGroupStageMode = LeagueGroupStageMode.UNIFORM
    groups: list[LeagueGroupStageGroupConfig] = Field(default_factory=list)
    qualifiers_per_group: int = Field(default=0, ge=0, le=32)
    best_extra_slots: int = Field(default=0, ge=0, le=32)
    wildcard_ranking: LeagueGroupWildcardRankingMetric = LeagueGroupWildcardRankingMetric.WIN_PERCENTAGE
    wildcard_tiebreakers: list[LeagueGroupWildcardRankingMetric] = Field(
        default_factory=lambda: [
            LeagueGroupWildcardRankingMetric.AVERAGE_POINT_DIFFERENCE,
            LeagueGroupWildcardRankingMetric.AVERAGE_POINTS_FOR,
        ]
    )


class LeagueBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=LEAGUE_NAME_MAX_LENGTH)
    responsible_name: str = Field(..., min_length=1, max_length=LEAGUE_RESPONSIBLE_NAME_MAX_LENGTH)
    responsible_email: EmailStr
    category: str = Field(..., min_length=1, max_length=LEAGUE_CATEGORY_MAX_LENGTH)
    status: LeagueStatus = LeagueStatus.PENDING
    competition_type: LeagueCompetitionType = LeagueCompetitionType.LEAGUE
    regular_season_format: LeagueRegularSeasonFormat = LeagueRegularSeasonFormat.SINGLE_ROUND
    standings_tiebreakers: list[LeagueStandingsTiebreaker] = Field(
        default_factory=lambda: [
            LeagueStandingsTiebreaker.HEAD_TO_HEAD,
            LeagueStandingsTiebreaker.POINT_DIFFERENCE,
            LeagueStandingsTiebreaker.POINTS_FOR,
        ],
        min_length=3,
        max_length=3,
    )
    start_date: date
    end_date: date
    tracked_stats: list[str] = Field(default_factory=list, max_length=12)
    final_phase_enabled: bool = False
    final_phase_preset: LeagueFinalPhasePreset = LeagueFinalPhasePreset.TOP_8_SINGLE_GAME
    final_phase_qualified_teams: int = Field(
        default=8,
        ge=LEAGUE_FINAL_PHASE_QUALIFIED_TEAMS_MIN,
        le=LEAGUE_FINAL_PHASE_QUALIFIED_TEAMS_MAX,
    )
    final_phase_byes: int = Field(default=0, ge=0)
    final_phase_format: LeagueFinalPhaseFormat = LeagueFinalPhaseFormat.SINGLE_ELIMINATION
    final_phase_two_legs: bool = False
    final_phase_third_place_match: bool = False
    final_phase_seeded_home_advantage: bool = True
    final_phase_seed_mode: Literal["STANDINGS", "RANDOM", "MANUAL"] = "STANDINGS"
    final_phase_play_in_slots: int = Field(default=0, ge=0)
    final_phase_round_best_of: int = Field(default=1, ge=1, le=7)
    final_phase_final_best_of: int = Field(default=1, ge=1, le=7)
    final_phase_reseed_each_round: bool = False
    final_phase_grand_final_reset: bool = False
    group_stage_config: Optional[LeagueGroupStageConfig] = None

    @field_validator("standings_tiebreakers")
    @classmethod
    def _validate_standings_tiebreakers(cls, value: list[LeagueStandingsTiebreaker]):
        if len(set(value)) != 3:
            raise ValueError("Los criterios de desempate no se pueden repetir.")
        return value


class LeagueCreate(LeagueBase):
    logo_base64: Optional[str] = Field(default=None, description="Optional league logo encoded in Base64.")
    team_ids: list[int] = Field(default_factory=list)


class LeagueUpdate(LeagueBase):
    logo_base64: Optional[str] = Field(..., description="Optional league logo encoded in Base64.")
    team_ids: list[int]
    confirm_regular_season_format_change: bool = False
    confirm_incomplete_finish: bool = False


class LeagueEliminationConversion(BaseModel):
    league: LeagueUpdate
    ordered_team_ids: list[int] = Field(..., min_length=2, max_length=32)
    expected_match_ids: list[int] = Field(..., min_length=1)
    seed_mode: Literal["STANDINGS", "RANDOM", "MANUAL"] = "MANUAL"


class LeagueTeamAssignmentsUpdate(BaseModel):
    team_ids: list[int]


class LeagueBracketGenerate(BaseModel):
    ordered_team_ids: list[int] = Field(..., min_length=2, max_length=32)
    seed_mode: Literal["STANDINGS", "RANDOM", "MANUAL"] = "MANUAL"
    confirm_incomplete_regular_season: bool = False


class LeagueOut(LeagueBase):
    id: int
    logo_base64: Optional[str] = Field(default=None, description="Optional league logo encoded in Base64.")
    team_ids: list[int]
    bracket_generated: bool = False
    bracket_completed: bool = False

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
    competition_type: LeagueCompetitionType
    regular_season_format: LeagueRegularSeasonFormat
    standings_tiebreakers: list[LeagueStandingsTiebreaker]
    responsible_name: str
    responsible_email: str
    start_date: date
    end_date: date
    logo_base64: Optional[str] = None
    tracked_stats: list[str]
    group_stage_config: Optional[LeagueGroupStageConfig] = None
    final_phase_enabled: bool
    final_phase_preset: LeagueFinalPhasePreset
    final_phase_qualified_teams: int
    final_phase_byes: int
    final_phase_format: LeagueFinalPhaseFormat
    final_phase_two_legs: bool
    final_phase_third_place_match: bool
    final_phase_seeded_home_advantage: bool
    final_phase_seed_mode: Literal["STANDINGS", "RANDOM", "MANUAL"]
    final_phase_play_in_slots: int
    final_phase_round_best_of: int
    final_phase_final_best_of: int
    final_phase_reseed_each_round: bool
    final_phase_grand_final_reset: bool
    bracket_generated: bool = False
    bracket_completed: bool = False
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


class LeagueGroupStandingOut(BaseModel):
    group_key: str
    group_name: str
    team_ids: list[int]
    match_count: int
    standings: list[LeagueStandingRowOut]


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
    group_standings: list[LeagueGroupStandingOut] = Field(default_factory=list)
    player_rankings: list[LeaguePlayerRankingRowOut]
    updated_at: datetime
