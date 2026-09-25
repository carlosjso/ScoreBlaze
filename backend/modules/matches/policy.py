from core.exceptions import NotFoundException, ValidationException
from modules.leagues.domain import LeagueCompetitionType
from modules.leagues.repositories import LeagueRepository
from modules.matches.domain import MatchCompetitionStage, resolve_match_result, validate_match_schedule, validate_match_teams
from modules.matches.repositories import MatchRepository
from modules.leagues.bracket import expected_manual_draft_count

from .schemas import MatchCreate, MatchUpdate


class MatchPolicy:
    def __init__(self, match_repo: MatchRepository, league_repo: LeagueRepository):
        self.match_repo = match_repo
        self.league_repo = league_repo

    def get_existing_match(self, match_id: int):
        match = self.match_repo.get(match_id)
        if not match:
            raise NotFoundException("Match not found")
        return match

    def ensure_teams_exist(self, team_a_id: int, team_b_id: int, winner_team_id: int | None) -> None:
        validate_match_teams(team_a_id, team_b_id, winner_team_id)

        ids_to_check = {team_a_id, team_b_id}
        if winner_team_id is not None:
            ids_to_check.add(winner_team_id)

        existing = self.match_repo.get_existing_team_ids(list(ids_to_check))
        missing = sorted(ids_to_check - existing)
        if missing:
            raise NotFoundException(f"Teams not found: {missing}")

    def ensure_league_assignment(self, league_id: int | None, team_a_id: int, team_b_id: int) -> None:
        if league_id is None:
            return

        league = self.league_repo.get(league_id)
        if not league:
            raise NotFoundException("Liga no encontrada para este partido.")

        league_team_ids = {membership.team_id for membership in league.team_memberships}
        missing = [team_id for team_id in (team_a_id, team_b_id) if team_id not in league_team_ids]
        if missing:
            raise ValidationException("Todos los equipos de un partido de liga deben pertenecer a la liga seleccionada.")

    @staticmethod
    def _group_team_ids_by_key(league) -> dict[str, set[int]]:
        if not isinstance(league.group_stage_config, dict):
            return {}

        groups = league.group_stage_config.get("groups")
        if not isinstance(groups, list):
            return {}

        group_team_ids_by_key: dict[str, set[int]] = {}
        for group in groups:
            if not isinstance(group, dict):
                continue

            group_key = str(group.get("key", "")).strip()
            if not group_key:
                continue

            raw_team_ids = group.get("team_ids", [])
            if not isinstance(raw_team_ids, list):
                continue

            group_team_ids_by_key[group_key] = {int(team_id) for team_id in raw_team_ids}

        return group_team_ids_by_key

    def resolve_competition_context(
        self,
        league_id: int | None,
        team_a_id: int,
        team_b_id: int,
        competition_stage: MatchCompetitionStage | None,
        group_stage_group_key: str | None,
    ) -> tuple[MatchCompetitionStage, str | None]:
        normalized_group_key = " ".join(group_stage_group_key.split()).strip() if group_stage_group_key else None

        if league_id is None:
            if normalized_group_key is not None:
                raise ValidationException("Solo los partidos ligados a grupos pueden registrar un grupo.")

            if competition_stage is not None and competition_stage != MatchCompetitionStage.REGULAR_SEASON:
                raise ValidationException("Los partidos sin competencia ligada solo pueden usar etapa regular.")

            return MatchCompetitionStage.REGULAR_SEASON, None

        league = self.league_repo.get(league_id)
        if not league:
            raise NotFoundException("Liga no encontrada para este partido.")

        self.ensure_league_assignment(league_id, team_a_id, team_b_id)

        league_competition_type = LeagueCompetitionType(str(league.competition_type))
        resolved_stage = competition_stage
        if resolved_stage is None:
            if league_competition_type == LeagueCompetitionType.ELIMINATION:
                resolved_stage = MatchCompetitionStage.FINAL_PHASE
            elif league_competition_type == LeagueCompetitionType.GROUPS:
                resolved_stage = MatchCompetitionStage.GROUP_STAGE
            else:
                resolved_stage = MatchCompetitionStage.REGULAR_SEASON

        if resolved_stage == MatchCompetitionStage.REGULAR_SEASON:
            if normalized_group_key is not None:
                raise ValidationException("La etapa regular no usa un grupo asignado.")

            if league_competition_type == LeagueCompetitionType.ELIMINATION:
                raise ValidationException("Una eliminatoria solo puede registrar partidos de fase final.")

            if league_competition_type == LeagueCompetitionType.GROUPS:
                raise ValidationException("Una competencia por grupos debe registrar partidos de grupos o fase final.")

            return MatchCompetitionStage.REGULAR_SEASON, None

        if resolved_stage == MatchCompetitionStage.FINAL_PHASE:
            if normalized_group_key is not None:
                raise ValidationException("La fase final no usa un grupo asignado.")

            if league_competition_type == LeagueCompetitionType.GROUPS and not bool(league.final_phase_enabled):
                raise ValidationException("Esta competencia por grupos no tiene fase final habilitada.")

            if league_competition_type == LeagueCompetitionType.LEAGUE and not bool(league.final_phase_enabled):
                raise ValidationException("Esta liga no tiene fase final habilitada.")

            return MatchCompetitionStage.FINAL_PHASE, None

        if league_competition_type != LeagueCompetitionType.GROUPS:
            raise ValidationException("Solo una competencia por grupos puede registrar partidos de fase de grupos.")

        group_team_ids_by_key = self._group_team_ids_by_key(league)
        if not group_team_ids_by_key:
            raise ValidationException("Configura los grupos antes de registrar partidos de fase de grupos.")

        matching_group_keys = [
            group_key
            for group_key, group_team_ids in group_team_ids_by_key.items()
            if team_a_id in group_team_ids and team_b_id in group_team_ids
        ]

        if normalized_group_key is None:
            if len(matching_group_keys) != 1:
                raise ValidationException("Indica a que grupo pertenece este partido.")
            normalized_group_key = matching_group_keys[0]

        group_team_ids = group_team_ids_by_key.get(normalized_group_key)
        if not group_team_ids:
            raise ValidationException("El grupo seleccionado no existe dentro de esta competencia.")

        if team_a_id not in group_team_ids or team_b_id not in group_team_ids:
            raise ValidationException("Los partidos de grupos solo pueden enfrentar equipos del mismo grupo.")

        return MatchCompetitionStage.GROUP_STAGE, normalized_group_key

    def validate_league_schedule_rules(
        self,
        data,
        competition_stage: MatchCompetitionStage,
        group_stage_group_key: str | None,
        *,
        exclude_match_id: int | None = None,
    ) -> None:
        if data.league_id is None:
            return

        league = self.league_repo.get(data.league_id)
        if not league:
            raise NotFoundException("Liga no encontrada para este partido.")

        if data.match_date < league.start_date or data.match_date > league.end_date:
            raise ValidationException("La fecha del partido debe estar dentro del periodo de la competencia.")

        if str(getattr(league, "status", "")) == "Finalizada":
            raise ValidationException("La competencia esta finalizada y sus partidos ya no admiten cambios.")

        if (
            competition_stage == MatchCompetitionStage.FINAL_PHASE
            and str(league.competition_type) == LeagueCompetitionType.ELIMINATION.value
        ):
            if getattr(league, "bracket_state", None):
                if exclude_match_id is None:
                    raise ValidationException(
                        "La llave ya esta cerrada. No puedes crear mas partidos; solo reprogramar o capturar resultados de sus cruces."
                    )
                return

            bracket_fields = (
                "bracket_round",
                "bracket_slot",
                "bracket_size",
                "bracket_game",
                "bracket_series_mode",
                "bracket_series_best_of",
                "bracket_path",
            )
            if any(getattr(data, field, None) is not None for field in bracket_fields):
                raise ValidationException("La estructura de una llave solo puede asignarse al pulsar Listo.")
            if (
                str(getattr(getattr(data, "status", None), "value", getattr(data, "status", "scheduled"))) != "scheduled"
                or getattr(data, "score_team_a", None) is not None
                or getattr(data, "score_team_b", None) is not None
                or getattr(data, "winner_team_id", None) is not None
            ):
                raise ValidationException("Antes de cerrar la llave, los cruces manuales deben permanecer programados y sin marcador.")

            draft_matches = [
                match
                for match in self.match_repo.list(league_id=league.id)
                if match.id != exclude_match_id
                and str(getattr(match, "competition_stage", "")) == MatchCompetitionStage.FINAL_PHASE.value
                and getattr(match, "bracket_round", None) is None
            ]
            used_team_ids = {
                int(team_id)
                for match in draft_matches
                for team_id in (match.team_a_id, match.team_b_id)
            }
            if int(data.team_a_id) in used_team_ids or int(data.team_b_id) in used_team_ids:
                raise ValidationException("Cada equipo solo puede aparecer en un cruce manual de la primera ronda.")
            draft_limit = expected_manual_draft_count(league, len(league.team_memberships))
            if len(draft_matches) >= draft_limit:
                raise ValidationException(
                    f"La primera ronda ya tiene sus {draft_limit} cruce(s) manual(es). Pulsa Listo para cerrar la llave."
                )
            return

        if competition_stage not in {MatchCompetitionStage.REGULAR_SEASON, MatchCompetitionStage.GROUP_STAGE}:
            return

        if getattr(league, "bracket_state", None):
            stage_label = "fase de grupos" if competition_stage == MatchCompetitionStage.GROUP_STAGE else "fase regular"
            raise ValidationException(
                f"La {stage_label} esta cerrada porque la llave ya fue generada. Reinicia la llave para modificar la tabla."
            )

        required_per_pair = 2 if str(league.regular_season_format) == "DOUBLE_ROUND" else 1
        pair = {int(data.team_a_id), int(data.team_b_id)}
        existing_pair_matches = [
            match
            for match in self.match_repo.list(league_id=league.id)
            if match.id != exclude_match_id
            and {int(match.team_a_id), int(match.team_b_id)} == pair
            and str(getattr(match, "competition_stage", MatchCompetitionStage.REGULAR_SEASON.value)) == competition_stage.value
            and (
                competition_stage != MatchCompetitionStage.GROUP_STAGE
                or str(getattr(match, "group_stage_group_key", "") or "") == str(group_stage_group_key or "")
            )
        ]
        if len(existing_pair_matches) >= required_per_pair:
            format_label = "ida y vuelta" if required_per_pair == 2 else "una vuelta"
            raise ValidationException(
                f"Este cruce ya alcanzo el limite permitido para el formato {format_label}."
            )
        if required_per_pair == 2 and len(existing_pair_matches) == 1:
            first_match = existing_pair_matches[0]
            if int(first_match.team_a_id) == int(data.team_a_id):
                raise ValidationException(
                    "En la segunda vuelta debes invertir el orden de los equipos respecto al primer partido."
                )

    def resolve_create_result(self, data: MatchCreate):
        validate_match_schedule(data.start_time, data.end_time)
        self.ensure_teams_exist(data.team_a_id, data.team_b_id, data.winner_team_id)
        self.ensure_league_assignment(data.league_id, data.team_a_id, data.team_b_id)
        return resolve_match_result(
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            score_team_a=data.score_team_a,
            score_team_b=data.score_team_b,
            winner_team_id=data.winner_team_id,
            is_draw=data.is_draw,
        )

    def resolve_update_result(self, data: MatchUpdate):
        validate_match_schedule(data.start_time, data.end_time)
        self.ensure_teams_exist(data.team_a_id, data.team_b_id, data.winner_team_id)
        self.ensure_league_assignment(data.league_id, data.team_a_id, data.team_b_id)
        return resolve_match_result(
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            score_team_a=data.score_team_a,
            score_team_b=data.score_team_b,
            winner_team_id=data.winner_team_id,
            is_draw=data.is_draw,
        )

    @staticmethod
    def validate_competition_result(data, result, competition_stage: MatchCompetitionStage) -> None:
        if data.status.value == "finished" and result.is_draw:
            raise ValidationException("Un partido de basquetbol finalizado no puede terminar empatado.")

        if competition_stage != MatchCompetitionStage.FINAL_PHASE:
            return

        if data.status.value == "finished" and result.winner_team_id is None:
            raise ValidationException("Un partido de eliminacion finalizado debe tener marcador y ganador.")
