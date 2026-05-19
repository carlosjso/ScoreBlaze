from __future__ import annotations

from modules.match_events.domain import MatchEventType

DEFAULT_MATCH_TRACKED_STATS = ["Fallo", "Faltas", "Asistencias", "Rebotes"]

TRACKED_STAT_BY_EVENT_TYPE: dict[MatchEventType, str] = {
    MatchEventType.MISS: "Fallo",
    MatchEventType.FOUL: "Faltas",
    MatchEventType.ASSIST: "Asistencias",
    MatchEventType.REBOUND: "Rebotes",
}


def normalize_match_tracked_stats(tracked_stats: list[str] | None) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    allowed_stats = set(DEFAULT_MATCH_TRACKED_STATS)

    for stat in list(tracked_stats or DEFAULT_MATCH_TRACKED_STATS):
        cleaned = " ".join(str(stat).split()).strip()
        if not cleaned or cleaned in seen or cleaned not in allowed_stats:
            continue
        normalized.append(cleaned)
        seen.add(cleaned)

    return normalized or list(DEFAULT_MATCH_TRACKED_STATS)


def get_tracked_stat_for_event(event_type: MatchEventType | str) -> str | None:
    normalized_event_type = MatchEventType(event_type)
    return TRACKED_STAT_BY_EVENT_TYPE.get(normalized_event_type)


def does_track_stat(stat_name: str, tracked_stats: list[str] | None) -> bool:
    return stat_name in set(normalize_match_tracked_stats(tracked_stats))


def is_event_type_tracked(event_type: MatchEventType | str, tracked_stats: list[str] | None) -> bool:
    tracked_stat = get_tracked_stat_for_event(event_type)
    if tracked_stat is None:
        return True
    return does_track_stat(tracked_stat, tracked_stats)
