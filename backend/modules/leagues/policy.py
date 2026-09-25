from __future__ import annotations

from core.exceptions import ConflictException, NotFoundException, ValidationException
from modules.teams.repositories import TeamRepository

from .domain import (
    LeagueCompetitionType,
    LeagueFinalPhaseFormat,
    LeagueFinalPhasePreset,
    normalize_tracked_stats,
    resolve_group_stage_config,
    resolve_final_phase_settings,
    validate_league_schedule,
)
from .repositories import LeagueRepository
from .schemas import LeagueGroupStageConfig


class LeaguePolicy:
    def __init__(self, league_repo: LeagueRepository, team_repo: TeamRepository):
        self.league_repo = league_repo
        self.team_repo = team_repo

    def get_existing_league(self, league_id: int):
        league = self.league_repo.get(league_id)
        if not league:
            raise NotFoundException("Liga no encontrada.")
        return league

    def ensure_name_available(self, name: str, current_league_id: int | None = None) -> None:
        existing = self.league_repo.get_by_name(name)
        if existing and existing.id != current_league_id:
            raise ConflictException("Ya existe una liga con ese nombre.")

    def resolve_team_ids(self, team_ids: list[int]) -> list[int]:
        unique_team_ids: list[int] = []
        seen: set[int] = set()

        for team_id in team_ids:
            if team_id in seen:
                continue
            unique_team_ids.append(team_id)
            seen.add(team_id)

        existing_ids = {team.id for team in self.team_repo.get_many_by_ids(unique_team_ids)}
        missing_ids = [team_id for team_id in unique_team_ids if team_id not in existing_ids]
        if missing_ids:
            raise NotFoundException(f"Equipos no encontrados para la liga: {missing_ids}")

        return unique_team_ids

    def prepare_payload(
        self,
        *,
        name: str,
        start_date,
        end_date,
        tracked_stats: list[str],
        team_ids: list[int],
        competition_type: LeagueCompetitionType,
        final_phase_enabled: bool,
        final_phase_preset: LeagueFinalPhasePreset,
        final_phase_qualified_teams: int,
        final_phase_byes: int,
        final_phase_format: LeagueFinalPhaseFormat,
        final_phase_two_legs: bool,
        final_phase_third_place_match: bool,
        final_phase_seeded_home_advantage: bool,
        final_phase_play_in_slots: int,
        final_phase_round_best_of: int,
        final_phase_final_best_of: int,
        final_phase_reseed_each_round: bool,
        final_phase_grand_final_reset: bool,
        group_stage_config: LeagueGroupStageConfig | None,
        final_phase_seed_mode: str = "STANDINGS",
        current_league_id: int | None = None,
    ) -> tuple[list[str], list[int], dict[str, object], dict[str, object] | None]:
        self.ensure_name_available(name, current_league_id=current_league_id)
        validate_league_schedule(start_date, end_date)
        resolved_team_ids = self.resolve_team_ids(team_ids)
        effective_final_phase_enabled = final_phase_enabled or competition_type == LeagueCompetitionType.ELIMINATION

        if competition_type == LeagueCompetitionType.ELIMINATION:
            final_phase_preset = LeagueFinalPhasePreset.CUSTOM
            final_phase_format = LeagueFinalPhaseFormat.SINGLE_ELIMINATION
            final_phase_byes = 0
            final_phase_play_in_slots = 0
            final_phase_seeded_home_advantage = False
            final_phase_reseed_each_round = False
            final_phase_grand_final_reset = False

        if competition_type == LeagueCompetitionType.ELIMINATION and len(resolved_team_ids) > 0:
            team_count = len(resolved_team_ids)
            if team_count < 2 or team_count > 32 or (team_count & (team_count - 1)) != 0:
                raise ValidationException("La eliminacion directa requiere 2, 4, 8, 16 o 32 equipos inscritos.")

        if competition_type == LeagueCompetitionType.ELIMINATION and len(resolved_team_ids) >= 2:
            # En una eliminatoria no existe un corte de clasificacion: todos los
            # equipos inscritos son participantes de la llave.
            final_phase_preset = LeagueFinalPhasePreset.CUSTOM
            final_phase_format = LeagueFinalPhaseFormat.SINGLE_ELIMINATION
            final_phase_qualified_teams = len(resolved_team_ids)
            final_phase_byes = 0
            final_phase_play_in_slots = 0
            final_phase_grand_final_reset = False

        final_phase_settings = resolve_final_phase_settings(
            enabled=effective_final_phase_enabled,
            preset=final_phase_preset,
            qualified_teams=final_phase_qualified_teams,
            byes=final_phase_byes,
            format=final_phase_format,
            two_legs=final_phase_two_legs,
            third_place_match=final_phase_third_place_match,
            seeded_home_advantage=final_phase_seeded_home_advantage,
            play_in_slots=final_phase_play_in_slots,
            round_best_of=final_phase_round_best_of,
            final_best_of=final_phase_final_best_of,
            reseed_each_round=final_phase_reseed_each_round,
            grand_final_reset=final_phase_grand_final_reset,
            current_team_count=len(resolved_team_ids),
        )
        resolved_group_stage_config = resolve_group_stage_config(
            competition_type=competition_type,
            group_stage_config=group_stage_config,
            registered_team_ids=resolved_team_ids,
            final_phase_enabled=effective_final_phase_enabled,
            final_phase_qualified_teams=final_phase_settings.qualified_teams,
        )

        return (
            normalize_tracked_stats(tracked_stats),
            resolved_team_ids,
            {
                "competition_type": competition_type.value,
                "final_phase_enabled": final_phase_settings.enabled,
                "final_phase_preset": final_phase_settings.preset.value,
                "final_phase_format": final_phase_settings.format.value,
                "final_phase_qualified_teams": final_phase_settings.qualified_teams,
                "final_phase_byes": final_phase_settings.byes,
                "final_phase_two_legs": final_phase_settings.two_legs,
                "final_phase_third_place_match": final_phase_settings.third_place_match,
                "final_phase_seeded_home_advantage": final_phase_settings.seeded_home_advantage,
                "final_phase_seed_mode": final_phase_seed_mode,
                "final_phase_play_in_slots": final_phase_settings.play_in_slots,
                "final_phase_round_best_of": final_phase_settings.round_best_of,
                "final_phase_final_best_of": final_phase_settings.final_best_of,
                "final_phase_reseed_each_round": final_phase_settings.reseed_each_round,
                "final_phase_grand_final_reset": final_phase_settings.grand_final_reset,
            },
            resolved_group_stage_config,
        )

    def validate_final_phase_for_team_assignments(self, *, league, team_ids: list[int]) -> dict[str, object] | None:
        team_count = len(team_ids)
        is_elimination = str(league.competition_type) == LeagueCompetitionType.ELIMINATION.value
        if is_elimination and team_count > 0 and (
            team_count < 2 or team_count > 32 or (team_count & (team_count - 1)) != 0
        ):
            raise ValidationException("La eliminacion directa requiere 2, 4, 8, 16 o 32 equipos inscritos.")

        preset = LeagueFinalPhasePreset(league.final_phase_preset)
        qualified_teams = int(league.final_phase_qualified_teams or 0)
        byes = int(league.final_phase_byes or 0)
        play_in_slots = int(league.final_phase_play_in_slots or 0)
        format = LeagueFinalPhaseFormat(league.final_phase_format)
        should_persist_normalized_settings = False

        if is_elimination:
            should_persist_normalized_settings = True
            preset = LeagueFinalPhasePreset.CUSTOM
            format = LeagueFinalPhaseFormat.SINGLE_ELIMINATION
            byes = 0
            play_in_slots = 0

        if is_elimination and team_count >= 2:
            should_persist_normalized_settings = True
            preset = LeagueFinalPhasePreset.CUSTOM
            format = LeagueFinalPhaseFormat.SINGLE_ELIMINATION
            qualified_teams = team_count
            byes = 0
            play_in_slots = 0
        elif (
            str(league.competition_type) == LeagueCompetitionType.LEAGUE.value
            and bool(league.final_phase_enabled)
            and team_count >= 2
            and qualified_teams > team_count
            and format == LeagueFinalPhaseFormat.SINGLE_ELIMINATION
        ):
            # Al inscribir los primeros equipos en una liga con playoffs, el
            # corte inicial se ajusta para que la configuracion siga siendo guardable.
            should_persist_normalized_settings = True
            preset = LeagueFinalPhasePreset.CUSTOM
            qualified_teams = team_count
            bracket_size = 1 << max(1, team_count - 1).bit_length()
            byes = bracket_size - team_count
            play_in_slots = 0

        effective_final_phase_enabled = bool(league.final_phase_enabled) or is_elimination
        settings = resolve_final_phase_settings(
            enabled=effective_final_phase_enabled,
            preset=preset,
            qualified_teams=qualified_teams,
            byes=byes,
            format=format,
            two_legs=bool(league.final_phase_two_legs),
            third_place_match=bool(league.final_phase_third_place_match),
            seeded_home_advantage=False if is_elimination else bool(league.final_phase_seeded_home_advantage),
            play_in_slots=play_in_slots,
            round_best_of=int(league.final_phase_round_best_of or 1),
            final_best_of=int(league.final_phase_final_best_of or 1),
            reseed_each_round=False if is_elimination else bool(league.final_phase_reseed_each_round),
            grand_final_reset=False if is_elimination else bool(league.final_phase_grand_final_reset),
            current_team_count=team_count,
        )
        resolve_group_stage_config(
            competition_type=LeagueCompetitionType(str(league.competition_type)),
            group_stage_config=LeagueGroupStageConfig.model_validate(league.group_stage_config)
            if league.group_stage_config is not None
            else None,
            registered_team_ids=team_ids,
            final_phase_enabled=effective_final_phase_enabled,
            final_phase_qualified_teams=int(league.final_phase_qualified_teams or 0),
        )

        if not should_persist_normalized_settings:
            return None

        return {
            "final_phase_enabled": settings.enabled,
            "final_phase_preset": settings.preset.value,
            "final_phase_format": settings.format.value,
            "final_phase_qualified_teams": settings.qualified_teams,
            "final_phase_byes": settings.byes,
            "final_phase_two_legs": settings.two_legs,
            "final_phase_third_place_match": settings.third_place_match,
            "final_phase_seeded_home_advantage": settings.seeded_home_advantage,
            "final_phase_seed_mode": str(getattr(league, "final_phase_seed_mode", "STANDINGS")),
            "final_phase_play_in_slots": settings.play_in_slots,
            "final_phase_round_best_of": settings.round_best_of,
            "final_phase_final_best_of": settings.final_best_of,
            "final_phase_reseed_each_round": settings.reseed_each_round,
            "final_phase_grand_final_reset": settings.grand_final_reset,
        }
