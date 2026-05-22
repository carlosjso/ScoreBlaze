from __future__ import annotations

from datetime import date
from typing import NamedTuple

from core.exceptions import ValidationException

from .enums import LeagueFinalPhaseFormat, LeagueFinalPhasePreset

DEFAULT_TRACKED_STATS = ["Fallo", "Faltas", "Asistencias", "Rebotes"]
LEAGUE_STANDINGS_WIN_POINTS = 2
LEAGUE_STANDINGS_DRAW_POINTS = 1


class FinalPhaseSettings(NamedTuple):
    enabled: bool
    preset: LeagueFinalPhasePreset
    format: LeagueFinalPhaseFormat
    qualified_teams: int
    byes: int
    two_legs: bool
    third_place_match: bool
    seeded_home_advantage: bool
    play_in_slots: int
    round_best_of: int
    final_best_of: int
    reseed_each_round: bool
    grand_final_reset: bool


DEFAULT_FINAL_PHASE_SETTINGS = FinalPhaseSettings(
    enabled=False,
    preset=LeagueFinalPhasePreset.TOP_8_SINGLE_GAME,
    format=LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
    qualified_teams=8,
    byes=0,
    two_legs=False,
    third_place_match=False,
    seeded_home_advantage=True,
    play_in_slots=0,
    round_best_of=1,
    final_best_of=1,
    reseed_each_round=False,
    grand_final_reset=False,
)

FINAL_PHASE_PRESET_SETTINGS: dict[LeagueFinalPhasePreset, FinalPhaseSettings] = {
    LeagueFinalPhasePreset.TOP_4_SINGLE_GAME: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.TOP_4_SINGLE_GAME,
        format=LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
        qualified_teams=4,
        byes=0,
        two_legs=False,
        third_place_match=False,
        seeded_home_advantage=True,
        play_in_slots=0,
        round_best_of=1,
        final_best_of=1,
        reseed_each_round=False,
        grand_final_reset=False,
    ),
    LeagueFinalPhasePreset.TOP_8_SINGLE_GAME: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.TOP_8_SINGLE_GAME,
        format=LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
        qualified_teams=8,
        byes=0,
        two_legs=False,
        third_place_match=False,
        seeded_home_advantage=True,
        play_in_slots=0,
        round_best_of=1,
        final_best_of=1,
        reseed_each_round=False,
        grand_final_reset=False,
    ),
    LeagueFinalPhasePreset.TOP_8_HOME_AWAY: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.TOP_8_HOME_AWAY,
        format=LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
        qualified_teams=8,
        byes=0,
        two_legs=True,
        third_place_match=False,
        seeded_home_advantage=True,
        play_in_slots=0,
        round_best_of=1,
        final_best_of=1,
        reseed_each_round=False,
        grand_final_reset=False,
    ),
    LeagueFinalPhasePreset.TOP_6_SINGLE_GAME_WITH_BYES: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.TOP_6_SINGLE_GAME_WITH_BYES,
        format=LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
        qualified_teams=6,
        byes=2,
        two_legs=False,
        third_place_match=False,
        seeded_home_advantage=True,
        play_in_slots=0,
        round_best_of=1,
        final_best_of=1,
        reseed_each_round=False,
        grand_final_reset=False,
    ),
    LeagueFinalPhasePreset.TOP_16_SINGLE_GAME: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.TOP_16_SINGLE_GAME,
        format=LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
        qualified_teams=16,
        byes=0,
        two_legs=False,
        third_place_match=False,
        seeded_home_advantage=True,
        play_in_slots=0,
        round_best_of=1,
        final_best_of=1,
        reseed_each_round=False,
        grand_final_reset=False,
    ),
    LeagueFinalPhasePreset.TOP_32_SINGLE_GAME: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.TOP_32_SINGLE_GAME,
        format=LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
        qualified_teams=32,
        byes=0,
        two_legs=False,
        third_place_match=False,
        seeded_home_advantage=True,
        play_in_slots=0,
        round_best_of=1,
        final_best_of=1,
        reseed_each_round=False,
        grand_final_reset=False,
    ),
    LeagueFinalPhasePreset.NBA_PLAY_IN_TOP_10: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.NBA_PLAY_IN_TOP_10,
        format=LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET,
        qualified_teams=10,
        byes=6,
        two_legs=False,
        third_place_match=False,
        seeded_home_advantage=True,
        play_in_slots=4,
        round_best_of=1,
        final_best_of=7,
        reseed_each_round=False,
        grand_final_reset=False,
    ),
    LeagueFinalPhasePreset.DOUBLE_ELIMINATION_TOP_8: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.DOUBLE_ELIMINATION_TOP_8,
        format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION,
        qualified_teams=8,
        byes=0,
        two_legs=False,
        third_place_match=False,
        seeded_home_advantage=False,
        play_in_slots=0,
        round_best_of=1,
        final_best_of=3,
        reseed_each_round=False,
        grand_final_reset=True,
    ),
    LeagueFinalPhasePreset.DOUBLE_ELIMINATION_TOP_16: FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.DOUBLE_ELIMINATION_TOP_16,
        format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION,
        qualified_teams=16,
        byes=0,
        two_legs=False,
        third_place_match=False,
        seeded_home_advantage=False,
        play_in_slots=0,
        round_best_of=1,
        final_best_of=3,
        reseed_each_round=False,
        grand_final_reset=True,
    ),
}

ALLOWED_BEST_OF_VALUES = {1, 3, 5, 7}


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


def resolve_final_phase_settings(
    *,
    enabled: bool,
    preset: LeagueFinalPhasePreset,
    qualified_teams: int,
    byes: int,
    format: LeagueFinalPhaseFormat,
    two_legs: bool,
    third_place_match: bool,
    seeded_home_advantage: bool,
    play_in_slots: int,
    round_best_of: int,
    final_best_of: int,
    reseed_each_round: bool,
    grand_final_reset: bool,
    current_team_count: int,
) -> FinalPhaseSettings:
    if not enabled:
        return DEFAULT_FINAL_PHASE_SETTINGS

    if preset != LeagueFinalPhasePreset.CUSTOM:
        preset_settings = FINAL_PHASE_PRESET_SETTINGS[preset]
        if current_team_count > 0 and preset_settings.qualified_teams > current_team_count:
            raise ValidationException(
                "La fase final no puede clasificar mas equipos de los inscritos en la liga."
            )
        return preset_settings

    if qualified_teams < 2:
        raise ValidationException("La fase final personalizada requiere al menos 2 equipos clasificados.")

    if qualified_teams > 32:
        raise ValidationException("La fase final personalizada no puede clasificar mas de 32 equipos.")

    if qualified_teams % 2 != 0:
        raise ValidationException("La fase final personalizada requiere un numero par de equipos clasificados.")

    if byes < 0:
        raise ValidationException("Los byes de fase final no pueden ser negativos.")

    if byes >= qualified_teams:
        raise ValidationException("Los byes de fase final deben ser menores al total de equipos clasificados.")

    if current_team_count > 0 and qualified_teams > current_team_count:
        raise ValidationException("La fase final no puede clasificar mas equipos de los inscritos en la liga.")

    if round_best_of not in ALLOWED_BEST_OF_VALUES:
        raise ValidationException("El formato personalizado requiere mejor de 1, 3, 5 o 7 partidos por ronda.")

    if final_best_of not in ALLOWED_BEST_OF_VALUES:
        raise ValidationException("La final personalizada requiere mejor de 1, 3, 5 o 7 partidos.")

    if play_in_slots < 0:
        raise ValidationException("Los cupos de play-in no pueden ser negativos.")

    if play_in_slots >= qualified_teams:
        raise ValidationException("Los cupos de play-in deben ser menores al total de equipos clasificados.")

    if format == LeagueFinalPhaseFormat.SINGLE_ELIMINATION and (qualified_teams - byes) % 2 != 0:
        raise ValidationException(
            "La eliminacion simple requiere que los equipos en primera ronda (clasificados menos byes) sean pares."
        )

    if format == LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET and play_in_slots < 2:
        raise ValidationException("El formato play-in requiere al menos 2 equipos en la fase de play-in.")

    if format == LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET and play_in_slots % 2 != 0:
        raise ValidationException("El formato play-in requiere una cantidad par de cupos de play-in.")

    if format == LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET and byes != (qualified_teams - play_in_slots):
        raise ValidationException(
            "En formato play-in, los byes deben coincidir con los equipos que avanzan directo al bracket."
        )

    if format != LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET and play_in_slots != 0:
        raise ValidationException("Solo el formato play-in puede registrar cupos de play-in.")

    if format == LeagueFinalPhaseFormat.DOUBLE_ELIMINATION and byes != 0:
        raise ValidationException("La doble eliminacion no permite byes en esta version.")

    if format == LeagueFinalPhaseFormat.DOUBLE_ELIMINATION and (qualified_teams & (qualified_teams - 1)) != 0:
        raise ValidationException("La doble eliminacion requiere una cantidad potencia de 2 en equipos clasificados.")

    if format == LeagueFinalPhaseFormat.DOUBLE_ELIMINATION and two_legs:
        raise ValidationException("La doble eliminacion no es compatible con series de ida y vuelta.")

    if format != LeagueFinalPhaseFormat.DOUBLE_ELIMINATION and grand_final_reset:
        raise ValidationException("El reinicio de gran final solo aplica en doble eliminacion.")

    return FinalPhaseSettings(
        enabled=True,
        preset=LeagueFinalPhasePreset.CUSTOM,
        format=format,
        qualified_teams=qualified_teams,
        byes=byes,
        two_legs=two_legs,
        third_place_match=third_place_match,
        seeded_home_advantage=seeded_home_advantage,
        play_in_slots=play_in_slots,
        round_best_of=round_best_of,
        final_best_of=final_best_of,
        reseed_each_round=reseed_each_round,
        grand_final_reset=grand_final_reset,
    )
