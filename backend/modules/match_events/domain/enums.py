from enum import StrEnum


class MatchEventType(StrEnum):
    POINT_1 = "point_1"
    POINT_2 = "point_2"
    POINT_3 = "point_3"
    MISS = "miss"
    FOUL = "foul"
    REBOUND = "rebound"
    ASSIST = "assist"


class MatchEventStatus(StrEnum):
    ACTIVE = "active"
    VOIDED = "voided"
