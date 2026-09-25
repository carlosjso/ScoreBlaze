from __future__ import annotations

from core.exceptions import NotFoundException, ValidationException
from data.orm import Match
from database.unit_of_work import UnitOfWork
from modules.matches.domain import MatchCompetitionStage, MatchResult
from modules.matches.repositories import MatchRepository
from modules.leagues.bracket import advance_bracket_match

from .policy import MatchPolicy
from .schemas import MatchCreate, MatchPatch, MatchUpdate
from .tracked_stats import normalize_match_tracked_stats


class MatchService:
    def __init__(
        self,
        match_repo: MatchRepository,
        unit_of_work: UnitOfWork,
        policy: MatchPolicy,
    ):
        self.match_repo = match_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _build_match(
        data: MatchCreate,
        result: MatchResult,
        tracked_stats: list[str],
        competition_stage: MatchCompetitionStage,
        group_stage_group_key: str | None,
    ) -> Match:
        return Match(
            match_date=data.match_date,
            start_time=data.start_time,
            end_time=data.end_time,
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            league_id=data.league_id,
            score_team_a=data.score_team_a,
            score_team_b=data.score_team_b,
            winner_team_id=result.winner_team_id,
            is_draw=result.is_draw,
            court=data.court,
            tournament=data.tournament,
            tracked_stats=tracked_stats,
            competition_stage=competition_stage.value,
            group_stage_group_key=group_stage_group_key,
            bracket_round=data.bracket_round,
            bracket_slot=data.bracket_slot,
            bracket_size=data.bracket_size,
            bracket_game=data.bracket_game,
            bracket_series_mode=data.bracket_series_mode,
            bracket_series_best_of=data.bracket_series_best_of,
            bracket_path=data.bracket_path,
            status=data.status.value,
        )

    def _resolve_tracked_stats(self, league_id: int | None, tracked_stats: list[str] | None) -> list[str]:
        if league_id is None:
            return normalize_match_tracked_stats(tracked_stats)

        league = self.policy.league_repo.get(league_id)
        if not league:
            raise NotFoundException("Liga no encontrada para este partido.")

        return normalize_match_tracked_stats(list(league.tracked_stats or []))

    def create(self, data: MatchCreate) -> Match:
        result = self.policy.resolve_create_result(data)
        tracked_stats = self._resolve_tracked_stats(data.league_id, data.tracked_stats)
        competition_stage, group_stage_group_key = self.policy.resolve_competition_context(
            data.league_id,
            data.team_a_id,
            data.team_b_id,
            data.competition_stage,
            data.group_stage_group_key,
        )
        self.policy.validate_league_schedule_rules(data, competition_stage, group_stage_group_key)
        self.policy.validate_competition_result(data, result, competition_stage)

        match = self._build_match(data, result, tracked_stats, competition_stage, group_stage_group_key)
        with self.unit_of_work.transaction():
            self.match_repo.add(match)
        self.unit_of_work.refresh(match)
        return match

    def list(self, league_id: int | None = None) -> list[Match]:
        return self.match_repo.list(league_id=league_id)

    def get(self, match_id: int) -> Match:
        return self.policy.get_existing_match(match_id)

    @staticmethod
    def _update_from_match(match: Match) -> MatchUpdate:
        return MatchUpdate(
            match_date=match.match_date,
            start_time=match.start_time,
            end_time=match.end_time,
            team_a_id=match.team_a_id,
            team_b_id=match.team_b_id,
            league_id=match.league_id,
            score_team_a=match.score_team_a,
            score_team_b=match.score_team_b,
            winner_team_id=match.winner_team_id,
            is_draw=match.is_draw,
            court=match.court,
            tournament=match.tournament,
            tracked_stats=normalize_match_tracked_stats(list(match.tracked_stats or [])),
            competition_stage=MatchCompetitionStage(str(getattr(match, "competition_stage", MatchCompetitionStage.REGULAR_SEASON.value))),
            group_stage_group_key=getattr(match, "group_stage_group_key", None),
            bracket_round=getattr(match, "bracket_round", None),
            bracket_slot=getattr(match, "bracket_slot", None),
            bracket_size=getattr(match, "bracket_size", None),
            bracket_game=getattr(match, "bracket_game", None),
            bracket_series_mode=getattr(match, "bracket_series_mode", None),
            bracket_series_best_of=getattr(match, "bracket_series_best_of", None),
            bracket_path=getattr(match, "bracket_path", None),
            status=match.status,
        )

    @staticmethod
    def _merge_patch(match: Match, data: MatchPatch) -> MatchUpdate:
        current = MatchService._update_from_match(match)
        patched = current.model_copy(update=data.model_dump(exclude_unset=True))
        return MatchUpdate.model_validate(patched.model_dump())

    def _apply_update(self, match: Match, data: MatchUpdate) -> Match:
        match_stage = str(getattr(match, "competition_stage", MatchCompetitionStage.REGULAR_SEASON.value))
        if match.league_id and match_stage in {
            MatchCompetitionStage.REGULAR_SEASON.value,
            MatchCompetitionStage.GROUP_STAGE.value,
        }:
            league = self.policy.league_repo.get(match.league_id)
            if league and league.bracket_state:
                stage_label = "fase de grupos" if match_stage == MatchCompetitionStage.GROUP_STAGE.value else "fase regular"
                raise ValidationException(
                    f"La {stage_label} esta cerrada porque la llave ya fue generada. Reinicia la llave para modificar la tabla."
                )
        if getattr(match, "bracket_round", None) is not None and (
            data.team_a_id != match.team_a_id
            or data.team_b_id != match.team_b_id
            or data.league_id != match.league_id
        ):
            raise ValidationException(
                "Los participantes de un cruce generado no se pueden cambiar. Reinicia la llave para modificar la siembra."
            )
        result = self.policy.resolve_update_result(data)
        tracked_stats = self._resolve_tracked_stats(data.league_id, data.tracked_stats)
        requested_stage = data.competition_stage
        requested_group_key = data.group_stage_group_key
        if requested_stage is None:
            requested_stage = MatchCompetitionStage(str(match.competition_stage))
            requested_group_key = getattr(match, "group_stage_group_key", None)

        competition_stage, group_stage_group_key = self.policy.resolve_competition_context(
            data.league_id,
            data.team_a_id,
            data.team_b_id,
            requested_stage,
            requested_group_key,
        )
        self.policy.validate_league_schedule_rules(
            data,
            competition_stage,
            group_stage_group_key,
            exclude_match_id=match.id,
        )
        self.policy.validate_competition_result(data, result, competition_stage)
        bracket_round = data.bracket_round if data.bracket_round is not None else getattr(match, "bracket_round", None)
        bracket_slot = data.bracket_slot if data.bracket_slot is not None else getattr(match, "bracket_slot", None)
        bracket_size = data.bracket_size if data.bracket_size is not None else getattr(match, "bracket_size", None)
        bracket_game = data.bracket_game if data.bracket_game is not None else getattr(match, "bracket_game", None)
        bracket_series_mode = data.bracket_series_mode if data.bracket_series_mode is not None else getattr(match, "bracket_series_mode", None)
        bracket_series_best_of = data.bracket_series_best_of if data.bracket_series_best_of is not None else getattr(match, "bracket_series_best_of", None)
        bracket_path = data.bracket_path if data.bracket_path is not None else getattr(match, "bracket_path", None)
        previous_winner_team_id = match.winner_team_id

        with self.unit_of_work.transaction():
            self.match_repo.update(
                match,
                match_date=data.match_date,
                start_time=data.start_time,
                end_time=data.end_time,
                team_a_id=data.team_a_id,
                team_b_id=data.team_b_id,
                league_id=data.league_id,
                score_team_a=data.score_team_a,
                score_team_b=data.score_team_b,
                winner_team_id=result.winner_team_id,
                is_draw=result.is_draw,
                court=data.court,
                tournament=data.tournament,
                tracked_stats=tracked_stats,
                competition_stage=competition_stage.value,
                group_stage_group_key=group_stage_group_key,
                bracket_round=bracket_round,
                bracket_slot=bracket_slot,
                bracket_size=bracket_size,
                bracket_game=bracket_game,
                bracket_series_mode=bracket_series_mode,
                bracket_series_best_of=bracket_series_best_of,
                bracket_path=bracket_path,
                status=data.status.value,
            )
            if match.league_id and bracket_round is not None:
                league = self.policy.league_repo.get(match.league_id)
                if league:
                    advance_bracket_match(league, match, previous_winner_team_id, self.match_repo)
        self.unit_of_work.refresh(match)
        return match

    def update(self, match_id: int, data: MatchUpdate) -> Match:
        match = self.policy.get_existing_match(match_id)
        return self._apply_update(match, data)

    def patch(self, match_id: int, data: MatchPatch) -> Match:
        match = self.policy.get_existing_match(match_id)
        return self._apply_update(match, self._merge_patch(match, data))

    def delete(self, match_id: int) -> None:
        match = self.policy.get_existing_match(match_id)
        match_stage = str(getattr(match, "competition_stage", MatchCompetitionStage.REGULAR_SEASON.value))
        if match.league_id and match_stage in {
            MatchCompetitionStage.REGULAR_SEASON.value,
            MatchCompetitionStage.GROUP_STAGE.value,
        }:
            league = self.policy.league_repo.get(match.league_id)
            if league and league.bracket_state:
                stage_label = "fase de grupos" if match_stage == MatchCompetitionStage.GROUP_STAGE.value else "fase regular"
                raise ValidationException(
                    f"La {stage_label} esta cerrada porque la llave ya fue generada. Reinicia la llave para modificar la tabla."
                )
        if getattr(match, "bracket_round", None) is not None:
            raise ValidationException(
                "Un cruce generado no se puede borrar por separado. Usa Reiniciar llave para eliminar la fase final completa."
            )
        with self.unit_of_work.transaction():
            self.match_repo.delete(match)
