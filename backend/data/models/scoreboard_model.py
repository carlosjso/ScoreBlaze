from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

from .match_model import MatchOut

ScoreboardTeamKey = Literal["A", "B"]
ScoreboardControlMode = Literal["buttons", "keyboard"]
ScoreboardEventType = Literal["point_1", "point_2", "point_3", "miss", "foul", "rebound", "assist"]
ScoreboardEventStatus = Literal["active", "voided"]
ScoreboardRealtimeMessageType = Literal["scoreboard_state"]


class ScoreboardRosterPlayerOut(BaseModel):
    id: Optional[int] = None
    name: str
    shirt_number: Optional[str] = None
    label: str


class ScoreboardTeamSnapshotOut(BaseModel):
    id: int
    key: ScoreboardTeamKey
    name: str
    logo_base64: Optional[str] = None
    score: int = Field(default=0, ge=0)
    fouls: int = Field(default=0, ge=0)
    players: list[ScoreboardRosterPlayerOut] = Field(default_factory=list)


class ScoreboardEventOut(BaseModel):
    id: int
    team_key: ScoreboardTeamKey
    team_id: int
    player_id: Optional[int] = None
    guest_name: Optional[str] = None
    event_type: ScoreboardEventType
    period: int = Field(..., ge=1)
    elapsed_seconds: int = Field(..., ge=0)
    event_order: int = Field(..., ge=0)
    status: ScoreboardEventStatus = "active"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScoreboardSnapshotOut(BaseModel):
    match: MatchOut
    team_a: ScoreboardTeamSnapshotOut
    team_b: ScoreboardTeamSnapshotOut
    events: list[ScoreboardEventOut] = Field(default_factory=list)


class ScoreboardEventCreate(BaseModel):
    team_key: ScoreboardTeamKey
    player_id: Optional[int] = None
    guest_name: Optional[str] = Field(default=None, max_length=250)
    event_type: ScoreboardEventType
    period: int = Field(..., ge=1)
    elapsed_seconds: int = Field(..., ge=0)


class ScoreboardRealtimePlayer(BaseModel):
    key: str = Field(..., min_length=1)
    playerId: Optional[int] = None
    label: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    shirtNumber: Optional[str] = None


class ScoreboardRealtimeHistoryEvent(BaseModel):
    id: str = Field(..., min_length=1)
    type: str = Field(..., min_length=1)
    team: ScoreboardTeamKey
    teamId: Optional[int] = None
    player: str = Field(..., min_length=1)
    playerId: Optional[int] = None
    points: Optional[int] = Field(default=None, ge=0)
    text: str = Field(..., min_length=1)
    period: int = Field(..., ge=1)
    elapsedSeconds: int = Field(..., ge=0)
    eventOrder: int = Field(..., ge=0)
    createdAt: int = Field(..., ge=0)
    backendEventId: Optional[int] = None
    status: Optional[ScoreboardEventStatus] = None


class ScoreboardRealtimeTeamState(BaseModel):
    id: Optional[int] = None
    key: ScoreboardTeamKey
    name: str = Field(..., min_length=1)
    logo: Optional[str] = None
    score: int = Field(default=0, ge=0)
    fouls: int = Field(default=0, ge=0)
    selectedPlayer: Optional[str] = None
    players: list[ScoreboardRealtimePlayer] = Field(default_factory=list)


class ScoreboardRealtimeState(BaseModel):
    teamA: ScoreboardRealtimeTeamState
    teamB: ScoreboardRealtimeTeamState
    history: list[ScoreboardRealtimeHistoryEvent] = Field(default_factory=list)
    arrow: ScoreboardTeamKey
    controlMode: ScoreboardControlMode = "buttons"
    period: int = Field(..., ge=1)
    clockSeconds: int = Field(..., ge=0)
    shotClockSeconds: int = Field(..., ge=0)
    clockRunning: bool = False


class ScoreboardRealtimeStateMessage(BaseModel):
    type: ScoreboardRealtimeMessageType = "scoreboard_state"
    payload: ScoreboardRealtimeState
