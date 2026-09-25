from __future__ import annotations

from datetime import date
from typing import NamedTuple

from core.exceptions import ValidationException

from .enums import (
    LeagueCompetitionType,
    LeagueFinalPhaseFormat,
    LeagueFinalPhasePreset,
    LeagueGroupStageMode,
    LeagueGroupWildcardRankingMetric,
)

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
        two_legs=False,
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
MIN_GROUP_STAGE_GROUPS = 2
MAX_GROUP_STAGE_GROUPS = 16
MIN_TEAMS_PER_GROUP = 2
MAX_TEAMS_PER_GROUP = 5
DEFAULT_GROUP_STAGE_WILDCARD_TIEBREAKERS = (
    LeagueGroupWildcardRankingMetric.AVERAGE_POINT_DIFFERENCE,
    LeagueGroupWildcardRankingMetric.AVERAGE_POINTS_FOR,
)


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


def _normalize_unique_team_ids(team_ids: list[int]) -> list[int]:
    normalized_team_ids: list[int] = []
    seen: set[int] = set()

    for team_id in team_ids:
        if team_id in seen:
            continue
        normalized_team_ids.append(team_id)
        seen.add(team_id)

    return normalized_team_ids


def _normalize_group_stage_tiebreakers(
    tiebreakers: list[LeagueGroupWildcardRankingMetric] | None,
) -> list[LeagueGroupWildcardRankingMetric]:
    normalized: list[LeagueGroupWildcardRankingMetric] = []
    seen: set[str] = set()
    source = tiebreakers or list(DEFAULT_GROUP_STAGE_WILDCARD_TIEBREAKERS)

    for metric in source:
        if metric.value in seen:
            continue
        normalized.append(metric)
        seen.add(metric.value)

    return normalized or list(DEFAULT_GROUP_STAGE_WILDCARD_TIEBREAKERS)


def resolve_group_stage_config(
    *,
    competition_type: LeagueCompetitionType,
    group_stage_config,
    registered_team_ids: list[int],
    final_phase_enabled: bool,
    final_phase_qualified_teams: int,
) -> dict[str, object] | None:
    if competition_type != LeagueCompetitionType.GROUPS:
        if group_stage_config is not None:
            raise ValidationException("La configuracion de grupos solo aplica en competencias por grupos.")
        return None

    if group_stage_config is None:
        # A group tournament is created in stages: first the competition,
        # then its participants, and finally their group distribution.
        if final_phase_enabled:
            raise ValidationException("Configura los grupos antes de habilitar una fase final.")
        return None

    if not registered_team_ids:
        raise ValidationException("Primero inscribe los equipos antes de configurar los grupos.")

    normalized_registered_team_ids = _normalize_unique_team_ids(registered_team_ids)
    normalized_registered_team_id_set = set(normalized_registered_team_ids)
    groups = list(group_stage_config.groups or [])

    if len(groups) < MIN_GROUP_STAGE_GROUPS:
        raise ValidationException("La fase de grupos requiere al menos 2 grupos.")

    if len(groups) > MAX_GROUP_STAGE_GROUPS:
        raise ValidationException("La fase de grupos no puede exceder 16 grupos en esta version.")

    normalized_groups: list[dict[str, object]] = []
    seen_group_keys: set[str] = set()
    seen_group_names: set[str] = set()
    assigned_team_ids: set[int] = set()
    expected_uniform_size: int | None = None
    smallest_group_size: int | None = None

    for group in groups:
        group_key = group.key.strip()
        group_name = group.name.strip()

        if group_key.lower() in seen_group_keys:
            raise ValidationException("Cada grupo debe tener una clave unica.")

        if group_name.lower() in seen_group_names:
            raise ValidationException("Cada grupo debe tener un nombre unico.")

        normalized_group_team_ids = _normalize_unique_team_ids(group.team_ids)
        group_size = len(normalized_group_team_ids)

        if group_size < MIN_TEAMS_PER_GROUP:
            raise ValidationException("Cada grupo debe tener al menos 2 equipos.")

        if group_size > MAX_TEAMS_PER_GROUP:
            raise ValidationException("Cada grupo puede tener como maximo 5 equipos.")

        if group_stage_config.mode == LeagueGroupStageMode.UNIFORM:
            if expected_uniform_size is None:
                expected_uniform_size = group_size
            elif group_size != expected_uniform_size:
                raise ValidationException("El modo uniforme requiere que todos los grupos tengan el mismo tamano.")

        missing_team_ids = [team_id for team_id in normalized_group_team_ids if team_id not in normalized_registered_team_id_set]
        if missing_team_ids:
            raise ValidationException("Todos los equipos asignados a grupos deben pertenecer a la competencia.")

        duplicate_team_ids = [team_id for team_id in normalized_group_team_ids if team_id in assigned_team_ids]
        if duplicate_team_ids:
            raise ValidationException("Un equipo no puede pertenecer a mas de un grupo.")

        assigned_team_ids.update(normalized_group_team_ids)
        seen_group_keys.add(group_key.lower())
        seen_group_names.add(group_name.lower())
        smallest_group_size = group_size if smallest_group_size is None else min(smallest_group_size, group_size)

        normalized_groups.append(
            {
                "key": group_key,
                "name": group_name,
                "team_ids": normalized_group_team_ids,
            }
        )

    if assigned_team_ids != normalized_registered_team_id_set:
        raise ValidationException("Cada equipo inscrito debe pertenecer a exactamente un grupo.")

    qualifiers_per_group = int(group_stage_config.qualifiers_per_group or 0)
    best_extra_slots = int(group_stage_config.best_extra_slots or 0)
    wildcard_ranking = group_stage_config.wildcard_ranking
    wildcard_tiebreakers = _normalize_group_stage_tiebreakers(group_stage_config.wildcard_tiebreakers)

    if final_phase_enabled:
        if qualifiers_per_group < 1:
            raise ValidationException("Los grupos con fase final requieren al menos 1 clasificado fijo por grupo.")

        if smallest_group_size is not None and qualifiers_per_group > smallest_group_size:
            raise ValidationException("Los clasificados por grupo no pueden exceder el tamano del grupo mas pequeno.")

        if best_extra_slots > 0 and wildcard_ranking != LeagueGroupWildcardRankingMetric.WIN_PERCENTAGE:
            raise ValidationException("Los cupos extra entre grupos se comparan por porcentaje de victorias en esta version.")

        total_qualified_teams = len(normalized_groups) * qualifiers_per_group + best_extra_slots
        if total_qualified_teams != final_phase_qualified_teams:
            raise ValidationException("La clasificacion desde grupos debe coincidir con los equipos clasificados a la fase final.")
    else:
        if qualifiers_per_group != 0 or best_extra_slots != 0:
            raise ValidationException("Si no hay fase final, los grupos no deben registrar cupos de clasificacion.")

    return {
        "mode": group_stage_config.mode.value,
        "groups": normalized_groups,
        "qualifiers_per_group": qualifiers_per_group,
        "best_extra_slots": best_extra_slots,
        "wildcard_ranking": wildcard_ranking.value,
        "wildcard_tiebreakers": [metric.value for metric in wildcard_tiebreakers],
    }


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

    if format == LeagueFinalPhaseFormat.SINGLE_ELIMINATION:
        bracket_size = 1 << max(1, qualified_teams - 1).bit_length()
        expected_byes = bracket_size - qualified_teams
        if byes != expected_byes:
            raise ValidationException(
                f"Una llave de {qualified_teams} equipos requiere exactamente {expected_byes} byes."
            )

    if format == LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET and play_in_slots < 2:
        raise ValidationException("El formato play-in requiere al menos 2 equipos en la fase de play-in.")

    if format == LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET and play_in_slots % 2 != 0:
        raise ValidationException("El formato play-in requiere una cantidad par de cupos de play-in.")

    if format == LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET and byes != (qualified_teams - play_in_slots):
        raise ValidationException(
            "En formato play-in, los byes deben coincidir con los equipos que avanzan directo al bracket."
        )

    if format == LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET:
        main_bracket_teams = byes + play_in_slots // 2
        if (main_bracket_teams & (main_bracket_teams - 1)) != 0:
            raise ValidationException(
                "El play-in debe dejar una cantidad potencia de 2 para la llave principal."
            )

    if format != LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET and play_in_slots != 0:
        raise ValidationException("Solo el formato play-in puede registrar cupos de play-in.")

    if format == LeagueFinalPhaseFormat.DOUBLE_ELIMINATION and byes != 0:
        raise ValidationException("La doble eliminacion no permite byes en esta version.")

    if format == LeagueFinalPhaseFormat.DOUBLE_ELIMINATION and third_place_match:
        raise ValidationException("La doble eliminacion no usa partido por el tercer lugar.")

    main_bracket_teams = byes + play_in_slots // 2 if format == LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET else qualified_teams
    if third_place_match and main_bracket_teams < 4:
        raise ValidationException("El partido por el tercer lugar requiere al menos 4 equipos en la llave principal.")

    if format == LeagueFinalPhaseFormat.DOUBLE_ELIMINATION and reseed_each_round:
        raise ValidationException("La doble eliminacion conserva cruces fijos entre sus dos carriles.")

    if format == LeagueFinalPhaseFormat.DOUBLE_ELIMINATION and (qualified_teams & (qualified_teams - 1)) != 0:
        raise ValidationException("La doble eliminacion requiere una cantidad potencia de 2 en equipos clasificados.")

    if two_legs:
        raise ValidationException("Ida y vuelta pertenece a la fase regular y no es una serie eliminatoria.")

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
