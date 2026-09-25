from enum import StrEnum


class MatchStatus(StrEnum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINISHED = "finished"


class MatchCompetitionStage(StrEnum):
    REGULAR_SEASON = "REGULAR_SEASON"
    GROUP_STAGE = "GROUP_STAGE"
    FINAL_PHASE = "FINAL_PHASE"
