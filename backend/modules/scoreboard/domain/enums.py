from enum import StrEnum


class ScoreboardTeamKey(StrEnum):
    TEAM_A = "A"
    TEAM_B = "B"


class ScoreboardControlMode(StrEnum):
    BUTTONS = "buttons"
    KEYBOARD = "keyboard"


class ScoreboardRealtimeRole(StrEnum):
    CONTROL = "control"
    LIVE = "live"


class ScoreboardRealtimeMessageType(StrEnum):
    SCOREBOARD_STATE = "scoreboard_state"


class ScoreboardRealtimeEventType(StrEnum):
    POINT_1 = "POINT_1"
    POINT_2 = "POINT_2"
    POINT_3 = "POINT_3"
    ASSIST = "ASSIST"
    MISSED_SHOT = "MISSED_SHOT"
    REBOUND = "REBOUND"
    FOUL = "FOUL"
