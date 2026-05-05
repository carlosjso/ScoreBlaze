from collections.abc import Callable

from modules.match_events.domain import MatchEventType
from modules.scoreboard.domain import BasketballScoreboardRules

TEAM_FOUL_EVENTS = {MatchEventType.FOUL}


def _made_1pt_updates(player_stat, direction: int, rules: BasketballScoreboardRules) -> dict[str, int]:
    return {"made_1pt": rules.increment_non_negative(player_stat.made_1pt, direction)}


def _made_2pt_updates(player_stat, direction: int, rules: BasketballScoreboardRules) -> dict[str, int]:
    return {"made_2pt": rules.increment_non_negative(player_stat.made_2pt, direction)}


def _made_3pt_updates(player_stat, direction: int, rules: BasketballScoreboardRules) -> dict[str, int]:
    return {"made_3pt": rules.increment_non_negative(player_stat.made_3pt, direction)}


def _missed_shot_updates(player_stat, direction: int, rules: BasketballScoreboardRules) -> dict[str, int]:
    return {"missed_shots": rules.increment_non_negative(player_stat.missed_shots, direction)}


def _assist_updates(player_stat, direction: int, rules: BasketballScoreboardRules) -> dict[str, int]:
    return {"total_assists": rules.increment_non_negative(player_stat.total_assists, direction)}


def _rebound_updates(player_stat, direction: int, rules: BasketballScoreboardRules) -> dict[str, int]:
    return {"total_rebounds": rules.increment_non_negative(player_stat.total_rebounds, direction)}


def _foul_updates(player_stat, direction: int, rules: BasketballScoreboardRules) -> dict[str, int]:
    return {"total_fouls": rules.increment_non_negative(player_stat.total_fouls, direction)}


StatUpdateStrategy = Callable[[object, int, BasketballScoreboardRules], dict[str, int]]


MADE_SHOT_STRATEGIES: dict[MatchEventType, StatUpdateStrategy] = {
    MatchEventType.POINT_1: _made_1pt_updates,
    MatchEventType.POINT_2: _made_2pt_updates,
    MatchEventType.POINT_3: _made_3pt_updates,
}


PLAYER_EVENT_STRATEGIES: dict[MatchEventType, StatUpdateStrategy] = {
    MatchEventType.MISS: _missed_shot_updates,
    MatchEventType.ASSIST: _assist_updates,
    MatchEventType.REBOUND: _rebound_updates,
    MatchEventType.FOUL: _foul_updates,
}


def applies_team_foul(event_type: MatchEventType) -> bool:
    return event_type in TEAM_FOUL_EVENTS


def made_shot_updates(
    event_type: MatchEventType,
    player_stat,
    direction: int,
    rules: BasketballScoreboardRules,
) -> dict[str, int]:
    strategy = MADE_SHOT_STRATEGIES.get(event_type)
    if not strategy:
        return {}
    return strategy(player_stat, direction, rules)


def player_event_updates(
    event_type: MatchEventType,
    player_stat,
    direction: int,
    rules: BasketballScoreboardRules,
) -> dict[str, int]:
    strategy = PLAYER_EVENT_STRATEGIES.get(event_type)
    if not strategy:
        return {}
    return strategy(player_stat, direction, rules)
