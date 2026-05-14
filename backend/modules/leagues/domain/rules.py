from __future__ import annotations

from datetime import date

from core.exceptions import ValidationException

DEFAULT_TRACKED_STATS = ["Fallo", "Faltas", "Asistencias", "Rebotes"]
LEAGUE_STANDINGS_WIN_POINTS = 2
LEAGUE_STANDINGS_DRAW_POINTS = 1


def validate_league_schedule(start_date: date, end_date: date) -> None:
    if start_date > end_date:
        raise ValidationException("La fecha de inicio de la liga no puede ser posterior a la fecha final.")


def normalize_tracked_stats(tracked_stats: list[str]) -> list[str]:
    normalized: list[str] = []
    seen: set[str] = set()
    allowed_stats = set(DEFAULT_TRACKED_STATS)

    for stat in tracked_stats:
        cleaned = " ".join(stat.split()).strip()
        if not cleaned or cleaned in seen or cleaned not in allowed_stats:
            continue
        normalized.append(cleaned)
        seen.add(cleaned)

    return normalized or list(DEFAULT_TRACKED_STATS)
