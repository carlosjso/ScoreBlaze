from __future__ import annotations

from random import SystemRandom

from authentication.schemas import AuthUserOut
from core.exceptions import ForbiddenException, NotFoundException, ValidationException
from core.pagination import paginate_sequence
from data.orm import League
from database.unit_of_work import UnitOfWork
from modules.access_scope import TeamAccessScopeResolver
from modules.matches.repositories import MatchRepository
from modules.teams.repositories import TeamRepository
from utils.media import decode_base64_payload

from .bracket import build_bracket_state, build_bracket_state_from_drafts, required_byes
from .domain import (
    build_group_qualification_order,
    build_league_standings,
    LeagueCompetitionType,
    LeagueFinalPhaseFormat,
    LeagueStatus,
    summarize_group_schedule,
)
from .policy import LeaguePolicy
from .repositories import LeagueMembershipRepository, LeagueRepository
from .schemas import (
    LeagueCreate,
    LeagueBracketGenerate,
    LeagueDetailOut,
    LeagueEliminationConversion,
    LeagueOut,
    LeagueTableRowOut,
    LeagueTeamSummaryOut,
    LeagueTeamAssignmentsUpdate,
    LeagueUpdate,
    PaginatedLeaguesTableOut,
)


class LeagueService:
    def __init__(
        self,
        league_repo: LeagueRepository,
        team_repo: TeamRepository,
        league_membership_repo: LeagueMembershipRepository,
        match_repo: MatchRepository,
        unit_of_work: UnitOfWork,
        policy: LeaguePolicy,
        scope_resolver: TeamAccessScopeResolver | None = None,
    ):
        self.league_repo = league_repo
        self.team_repo = team_repo
        self.scope_resolver = scope_resolver
        self.league_membership_repo = league_membership_repo
        self.match_repo = match_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _decode_logo(logo_base64: str | None) -> bytes | None:
        return decode_base64_payload(logo_base64, "Invalid league logo. Could not decode Base64")

    def _filter_visible_leagues(self, leagues: list[League], current_user: AuthUserOut | None) -> list[League]:
        if current_user is None or self.scope_resolver is None:
            return leagues

        visible_team_ids = self.scope_resolver.get_visible_team_ids(current_user)
        if visible_team_ids is None:
            return leagues

        return [league for league in leagues if visible_team_ids.intersection(set(league.team_ids))]

    def _ensure_league_visible(self, league: League, current_user: AuthUserOut | None) -> League:
        if current_user is None or self.scope_resolver is None:
            return league

        visible_team_ids = self.scope_resolver.get_visible_team_ids(current_user)
        if visible_team_ids is None or visible_team_ids.intersection(set(league.team_ids)):
            return league

        raise NotFoundException("Liga no encontrada.")

    def _ensure_visible_team_ids(self, team_ids: list[int], current_user: AuthUserOut | None) -> None:
        if current_user is None or self.scope_resolver is None or not team_ids:
            return

        visible_team_ids = self.scope_resolver.get_visible_team_ids(current_user)
        if visible_team_ids is None:
            return

        if set(team_ids) - visible_team_ids:
            raise ForbiddenException("No tienes permisos para usar algunos equipos en esta liga.")

    def create(self, data: LeagueCreate, current_user: AuthUserOut | None = None) -> League:
        self._ensure_visible_team_ids(data.team_ids, current_user)
        tracked_stats, team_ids, final_phase_settings, group_stage_config = self.policy.prepare_payload(
            name=data.name,
            start_date=data.start_date,
            end_date=data.end_date,
            tracked_stats=data.tracked_stats,
            team_ids=data.team_ids,
            competition_type=data.competition_type,
            final_phase_enabled=data.final_phase_enabled,
            final_phase_preset=data.final_phase_preset,
            final_phase_qualified_teams=data.final_phase_qualified_teams,
            final_phase_byes=data.final_phase_byes,
            final_phase_format=data.final_phase_format,
            final_phase_two_legs=data.final_phase_two_legs,
            final_phase_third_place_match=data.final_phase_third_place_match,
            final_phase_seeded_home_advantage=data.final_phase_seeded_home_advantage,
            final_phase_seed_mode=data.final_phase_seed_mode,
            final_phase_play_in_slots=data.final_phase_play_in_slots,
            final_phase_round_best_of=data.final_phase_round_best_of,
            final_phase_final_best_of=data.final_phase_final_best_of,
            final_phase_reseed_each_round=data.final_phase_reseed_each_round,
            final_phase_grand_final_reset=data.final_phase_grand_final_reset,
            group_stage_config=data.group_stage_config,
        )

        league = League(
            name=data.name,
            responsible_name=data.responsible_name,
            responsible_email=data.responsible_email,
            category=data.category,
            status=data.status.value,
            regular_season_format=data.regular_season_format.value,
            standings_tiebreakers=[item.value for item in data.standings_tiebreakers],
            start_date=data.start_date,
            end_date=data.end_date,
            logo=self._decode_logo(data.logo_base64),
            tracked_stats=tracked_stats,
            group_stage_config=group_stage_config,
            **final_phase_settings,
        )

        with self.unit_of_work.transaction():
            self.league_repo.add(league)
            self.unit_of_work.flush()
            self.league_membership_repo.replace_team_ids_for_league(league.id, team_ids)

        return self.policy.get_existing_league(league.id)

    def list(self, *, competition_type: str | None = None, current_user: AuthUserOut | None = None) -> list[League]:
        leagues = self._filter_visible_leagues(self.league_repo.list(), current_user)
        if competition_type:
            return [league for league in leagues if str(league.competition_type) == competition_type]
        return leagues

    def list_table(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        sort_key: str,
        sort_dir: str,
        competition_type: str | None = None,
        current_user: AuthUserOut | None = None,
    ) -> PaginatedLeaguesTableOut:
        leagues = self._filter_visible_leagues(self.league_repo.list(), current_user)
        if competition_type:
            leagues = [league for league in leagues if str(league.competition_type) == competition_type]
        row_entries: list[dict[str, object]] = []

        for league in leagues:
            team_names = [membership.team.name for membership in league.team_memberships if membership.team is not None]
            row_entries.append(
                {
                    "row": LeagueTableRowOut(
                        id=league.id,
                        name=league.name,
                        category=league.category,
                        status=league.status,
                        competition_type=league.competition_type,
                        regular_season_format=league.regular_season_format,
                        standings_tiebreakers=list(league.standings_tiebreakers or []),
                        responsible_name=league.responsible_name,
                        responsible_email=league.responsible_email,
                        start_date=league.start_date,
                        end_date=league.end_date,
                        logo_base64=league.logo_base64,
                        tracked_stats=list(league.tracked_stats or []),
                        group_stage_config=league.group_stage_config,
                        final_phase_enabled=bool(league.final_phase_enabled),
                        final_phase_preset=league.final_phase_preset,
                        final_phase_qualified_teams=int(league.final_phase_qualified_teams or 0),
                        final_phase_byes=int(league.final_phase_byes or 0),
                        final_phase_format=league.final_phase_format,
                        final_phase_two_legs=bool(league.final_phase_two_legs),
                        final_phase_third_place_match=bool(league.final_phase_third_place_match),
                        final_phase_seeded_home_advantage=bool(league.final_phase_seeded_home_advantage),
                        final_phase_seed_mode=str(getattr(league, "final_phase_seed_mode", "STANDINGS")),
                        final_phase_play_in_slots=int(league.final_phase_play_in_slots or 0),
                        final_phase_round_best_of=int(league.final_phase_round_best_of or 1),
                        final_phase_final_best_of=int(league.final_phase_final_best_of or 1),
                        final_phase_reseed_each_round=bool(league.final_phase_reseed_each_round),
                        final_phase_grand_final_reset=bool(league.final_phase_grand_final_reset),
                        bracket_generated=bool(league.bracket_state),
                        bracket_completed=league.bracket_completed,
                        team_ids=league.team_ids,
                        team_count=len(league.team_ids),
                    ),
                    "team_names": team_names,
                }
            )

        normalized_search = search.strip().lower()
        if normalized_search:
            row_entries = [
                entry
                for entry in row_entries
                for row in [entry["row"]]
                if normalized_search in str(row.id)
                or normalized_search in row.name.lower()
                or normalized_search in row.category.lower()
                or normalized_search in row.status.value.lower()
                or normalized_search in row.competition_type.value.lower()
                or normalized_search in row.responsible_name.lower()
                or normalized_search in row.responsible_email.lower()
                or any(normalized_search in team_name.lower() for team_name in entry["team_names"])
            ]

        if sort_key == "id":
            row_entries.sort(key=lambda entry: entry["row"].id)
        elif sort_key == "status":
            row_entries.sort(key=lambda entry: (entry["row"].status.value.lower(), entry["row"].name.lower(), entry["row"].id))
        elif sort_key == "teams":
            row_entries.sort(key=lambda entry: (entry["row"].team_count, entry["row"].name.lower(), entry["row"].id))
        else:
            row_entries.sort(key=lambda entry: (entry["row"].name.lower(), entry["row"].id))

        if sort_dir == "desc":
            row_entries.reverse()

        page_entries, normalized_page, normalized_page_size, total_items = paginate_sequence(row_entries, page, page_size)
        total_pages = max(1, (total_items + normalized_page_size - 1) // normalized_page_size)

        return PaginatedLeaguesTableOut(
            items=[entry["row"] for entry in page_entries],
            page=normalized_page,
            page_size=normalized_page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

    def get(self, league_id: int, current_user: AuthUserOut | None = None) -> LeagueDetailOut:
        league = self._ensure_league_visible(self.policy.get_existing_league(league_id), current_user)
        matches_count = len(self.match_repo.list(league_id=league.id))

        teams = [
            LeagueTeamSummaryOut(
                id=membership.team.id,
                name=membership.team.name,
                logo_base64=membership.team.logo_base64,
                responsible_name=membership.team.responsible_name or "",
                responsible_email=membership.team.responsible_email or "",
                player_count=len({relation.player_id for relation in membership.team.team_memberships}),
                players_label=(
                    ", ".join(
                        sorted(
                            {
                                relation.player.name
                                for relation in membership.team.team_memberships
                                if getattr(relation, "player", None) is not None
                            }
                        )
                    )
                    or "Sin jugadores"
                ),
            )
            for membership in league.team_memberships
            if membership.team is not None
        ]

        return LeagueDetailOut(
            id=league.id,
            name=league.name,
            responsible_name=league.responsible_name,
            responsible_email=league.responsible_email,
            category=league.category,
            status=league.status,
            competition_type=league.competition_type,
            regular_season_format=league.regular_season_format,
            standings_tiebreakers=list(league.standings_tiebreakers or []),
            start_date=league.start_date,
            end_date=league.end_date,
            tracked_stats=list(league.tracked_stats or []),
            group_stage_config=league.group_stage_config,
            final_phase_enabled=bool(league.final_phase_enabled),
            final_phase_preset=league.final_phase_preset,
            final_phase_qualified_teams=int(league.final_phase_qualified_teams or 0),
            final_phase_byes=int(league.final_phase_byes or 0),
            final_phase_format=league.final_phase_format,
            final_phase_two_legs=bool(league.final_phase_two_legs),
            final_phase_third_place_match=bool(league.final_phase_third_place_match),
            final_phase_seeded_home_advantage=bool(league.final_phase_seeded_home_advantage),
            final_phase_seed_mode=str(getattr(league, "final_phase_seed_mode", "STANDINGS")),
            final_phase_play_in_slots=int(league.final_phase_play_in_slots or 0),
            final_phase_round_best_of=int(league.final_phase_round_best_of or 1),
            final_phase_final_best_of=int(league.final_phase_final_best_of or 1),
            final_phase_reseed_each_round=bool(league.final_phase_reseed_each_round),
            final_phase_grand_final_reset=bool(league.final_phase_grand_final_reset),
            bracket_generated=bool(league.bracket_state),
            bracket_completed=league.bracket_completed,
            logo_base64=league.logo_base64,
            team_ids=league.team_ids,
            teams=teams,
            matches_count=matches_count,
        )

    def list_matches(self, league_id: int, current_user: AuthUserOut | None = None):
        league = self._ensure_league_visible(self.policy.get_existing_league(league_id), current_user)
        return self.match_repo.list(league_id=league.id)

    def generate_bracket(
        self,
        league_id: int,
        data: LeagueBracketGenerate,
        current_user: AuthUserOut | None = None,
    ):
        league = self._ensure_league_visible(self.policy.get_existing_league(league_id), current_user)
        if str(league.status) == LeagueStatus.FINISHED.value:
            raise ValidationException("No puedes generar una llave dentro de una competencia finalizada.")
        if str(league.competition_type) != LeagueCompetitionType.ELIMINATION.value and not bool(league.final_phase_enabled):
            raise ValidationException("Activa la fase final antes de generar la llave.")

        configured_seed_mode = str(getattr(league, "final_phase_seed_mode", "STANDINGS"))
        if str(league.competition_type) == LeagueCompetitionType.LEAGUE.value and data.seed_mode != configured_seed_mode:
            raise ValidationException("El metodo de siembra cambio. Guarda primero la configuracion de la fase final.")

        ordered_team_ids = list(dict.fromkeys(data.ordered_team_ids))
        if len(ordered_team_ids) != len(data.ordered_team_ids):
            raise ValidationException("La siembra de la llave no puede repetir equipos.")

        registered_team_ids = set(league.team_ids)
        if any(team_id not in registered_team_ids for team_id in ordered_team_ids):
            raise ValidationException("Todos los equipos sembrados deben pertenecer a la competencia.")

        if str(league.competition_type) == LeagueCompetitionType.ELIMINATION.value:
            participant_count = len(registered_team_ids)
            if str(league.final_phase_format) != "SINGLE_ELIMINATION":
                raise ValidationException("La eliminacion directa solo admite una llave simple. Guarda primero Configurar modo.")
            if participant_count < 2 or participant_count > 32 or (participant_count & (participant_count - 1)) != 0:
                raise ValidationException("La eliminacion directa requiere 2, 4, 8, 16 o 32 participantes.")

        normalized_final_phase = self.policy.validate_final_phase_for_team_assignments(
            league=league,
            team_ids=list(league.team_ids),
        )
        expected_count = (
            len(registered_team_ids)
            if str(league.competition_type) == LeagueCompetitionType.ELIMINATION.value
            else int(league.final_phase_qualified_teams)
        )
        if expected_count > len(registered_team_ids):
            raise ValidationException(
                "La cantidad de clasificados supera los equipos inscritos. Ajusta los cupos antes de generar la llave."
            )
        if len(ordered_team_ids) != expected_count:
            noun = "participantes" if str(league.competition_type) == LeagueCompetitionType.ELIMINATION.value else "equipos clasificados"
            raise ValidationException(f"La llave requiere exactamente {expected_count} {noun}.")

        if data.seed_mode == "RANDOM":
            SystemRandom().shuffle(ordered_team_ids)

        existing_final_matches = [
            match
            for match in self.match_repo.list(league_id=league.id)
            if str(getattr(match, "competition_stage", "")) == "FINAL_PHASE"
        ]
        official_final_matches = [match for match in existing_final_matches if getattr(match, "bracket_round", None) is not None]
        draft_final_matches = [match for match in existing_final_matches if getattr(match, "bracket_round", None) is None]
        if official_final_matches:
            raise ValidationException("Ya existe una llave cerrada. Reiniciala antes de volver a generarla.")
        if draft_final_matches and str(league.competition_type) != LeagueCompetitionType.ELIMINATION.value:
            raise ValidationException("Ya existen partidos de fase final. Reinicia la llave antes de volver a generarla.")
        if draft_final_matches and data.seed_mode != "MANUAL":
            raise ValidationException("Ya definiste cruces manuales. Elige Manual y pulsa Listo, o elimina esos borradores antes de sortear.")

        if str(league.competition_type) == LeagueCompetitionType.LEAGUE.value:
            regular_matches = [
                match
                for match in self.match_repo.list(league_id=league.id)
                if str(getattr(match, "competition_stage", "REGULAR_SEASON")) != "FINAL_PHASE"
            ]
            required_per_pair = 2 if str(league.regular_season_format) == "DOUBLE_ROUND" else 1
            pair_counts: dict[tuple[int, int], int] = {}
            unfinished_matches = 0
            for match in regular_matches:
                pair = tuple(sorted((int(match.team_a_id), int(match.team_b_id))))
                pair_counts[pair] = pair_counts.get(pair, 0) + 1
                if str(match.status) != "finished":
                    unfinished_matches += 1
            expected_pairs = len(registered_team_ids) * (len(registered_team_ids) - 1) // 2
            covered_matches = sum(min(count, required_per_pair) for count in pair_counts.values())
            missing_matches = max(0, expected_pairs * required_per_pair - covered_matches)
            if (missing_matches or unfinished_matches) and not data.confirm_incomplete_regular_season:
                raise ValidationException(
                    f"La fase regular tiene {missing_matches} cruce(s) por crear y {unfinished_matches} partido(s) sin finalizar. Confirma el cierre anticipado para congelar la tabla."
                )

            team_lookup = {
                team.id: team for team in self.team_repo.get_many_by_ids(sorted(registered_team_ids))
            }
            standings = build_league_standings(
                team_ids=list(league.team_ids),
                team_lookup=team_lookup,
                matches=regular_matches,
                standings_match_ids={match.id for match in regular_matches},
                standings_tiebreakers=list(league.standings_tiebreakers or []),
            )
            qualified_team_ids = [int(row["team_id"]) for row in standings[:expected_count]]
            if set(ordered_team_ids) != set(qualified_team_ids):
                raise ValidationException("Solo los equipos ubicados dentro del Top configurado pueden entrar a la llave.")
            if data.seed_mode == "STANDINGS" and ordered_team_ids != qualified_team_ids:
                raise ValidationException("La siembra por tabla debe respetar el orden oficial de clasificacion.")

        if str(league.competition_type) == LeagueCompetitionType.GROUPS.value:
            group_matches = [
                match
                for match in self.match_repo.list(league_id=league.id)
                if str(getattr(match, "competition_stage", "")) == "GROUP_STAGE"
            ]
            audit = summarize_group_schedule(
                group_stage_config=league.group_stage_config,
                regular_season_format=str(league.regular_season_format),
                matches=group_matches,
            )
            if audit["duplicate_matches"]:
                raise ValidationException(
                    f"La fase de grupos tiene {audit['duplicate_matches']} partido(s) duplicado(s). Elimina los excedentes antes de generar la llave."
                )
            if (audit["missing_matches"] or audit["unfinished_matches"]) and not data.confirm_incomplete_regular_season:
                raise ValidationException(
                    f"La fase de grupos tiene {audit['missing_matches']} cruce(s) por crear y {audit['unfinished_matches']} partido(s) sin finalizar. Confirma el cierre anticipado para congelar las tablas."
                )

            team_lookup = {
                team.id: team for team in self.team_repo.get_many_by_ids(sorted(registered_team_ids))
            }
            qualification = build_group_qualification_order(
                group_stage_config=league.group_stage_config,
                team_lookup=team_lookup,
                matches=group_matches,
                standings_tiebreakers=list(league.standings_tiebreakers or []),
            )
            qualified_team_ids = [int(row["team_id"]) for row in qualification]
            if len(qualified_team_ids) != expected_count or set(ordered_team_ids) != set(qualified_team_ids):
                raise ValidationException("Solo los clasificados oficiales de los grupos pueden entrar a la llave.")
            if data.seed_mode == "STANDINGS" and ordered_team_ids != qualified_team_ids:
                raise ValidationException("La siembra por grupos debe respetar el orden oficial de clasificacion.")

        with self.unit_of_work.transaction():
            if normalized_final_phase:
                self.league_repo.update(league, **normalized_final_phase)
            state, created = (
                build_bracket_state_from_drafts(league, ordered_team_ids, draft_final_matches, self.match_repo)
                if draft_final_matches
                else build_bracket_state(league, ordered_team_ids, self.match_repo)
            )
            state["seed_mode"] = data.seed_mode
            self.league_repo.update(
                league,
                bracket_state=state,
                final_phase_byes=(
                    required_byes(len(ordered_team_ids))
                    if str(league.final_phase_format) == "SINGLE_ELIMINATION"
                    else int(league.final_phase_byes or 0)
                ),
            )

        return created

    def convert_to_single_elimination(
        self,
        league_id: int,
        data: LeagueEliminationConversion,
        current_user: AuthUserOut | None = None,
    ) -> League:
        league = self._ensure_league_visible(self.policy.get_existing_league(league_id), current_user)
        self._ensure_visible_team_ids(data.league.team_ids, current_user)
        if str(league.competition_type) == LeagueCompetitionType.ELIMINATION.value:
            raise ValidationException("La competencia ya es una eliminatoria.")
        if data.league.competition_type != LeagueCompetitionType.ELIMINATION:
            raise ValidationException("La conversion protegida solo admite el formato de eliminacion directa.")
        if data.league.final_phase_format != LeagueFinalPhaseFormat.SINGLE_ELIMINATION:
            raise ValidationException("Por ahora la conversion automatica solo admite eliminacion simple.")

        tracked_stats, team_ids, final_phase_settings, group_stage_config = self.policy.prepare_payload(
            name=data.league.name,
            start_date=data.league.start_date,
            end_date=data.league.end_date,
            tracked_stats=data.league.tracked_stats,
            team_ids=data.league.team_ids,
            competition_type=data.league.competition_type,
            final_phase_enabled=data.league.final_phase_enabled,
            final_phase_preset=data.league.final_phase_preset,
            final_phase_qualified_teams=data.league.final_phase_qualified_teams,
            final_phase_byes=data.league.final_phase_byes,
            final_phase_format=data.league.final_phase_format,
            final_phase_two_legs=data.league.final_phase_two_legs,
            final_phase_third_place_match=data.league.final_phase_third_place_match,
            final_phase_seeded_home_advantage=data.league.final_phase_seeded_home_advantage,
            final_phase_seed_mode=data.league.final_phase_seed_mode,
            final_phase_play_in_slots=data.league.final_phase_play_in_slots,
            final_phase_round_best_of=data.league.final_phase_round_best_of,
            final_phase_final_best_of=data.league.final_phase_final_best_of,
            final_phase_reseed_each_round=data.league.final_phase_reseed_each_round,
            final_phase_grand_final_reset=data.league.final_phase_grand_final_reset,
            group_stage_config=data.league.group_stage_config,
            current_league_id=league.id,
        )

        ordered_team_ids = list(dict.fromkeys(data.ordered_team_ids))
        if len(ordered_team_ids) != len(data.ordered_team_ids):
            raise ValidationException("La siembra de la llave no puede repetir equipos.")
        registered_team_ids = set(team_ids)
        if any(team_id not in registered_team_ids for team_id in ordered_team_ids):
            raise ValidationException("Todos los equipos sembrados deben pertenecer a la nueva eliminatoria.")
        expected_team_count = len(registered_team_ids)
        if len(ordered_team_ids) != expected_team_count:
            raise ValidationException(f"La llave requiere exactamente {expected_team_count} participantes.")

        expected_match_ids = list(dict.fromkeys(data.expected_match_ids))
        if len(expected_match_ids) != len(data.expected_match_ids):
            raise ValidationException("La confirmacion contiene partidos repetidos. Vuelve a abrir la edicion.")
        existing_matches = self.match_repo.list(league_id=league.id)
        if {match.id for match in existing_matches} != set(expected_match_ids):
            raise ValidationException(
                "Los partidos de la liga cambiaron mientras confirmabas. Recarga la competencia y vuelve a intentarlo."
            )

        with self.unit_of_work.transaction():
            self.league_membership_repo.replace_team_ids_for_league(league.id, team_ids)
            self.league_repo.update(
                league,
                name=data.league.name,
                responsible_name=data.league.responsible_name,
                responsible_email=data.league.responsible_email,
                category=data.league.category,
                status=data.league.status.value,
                regular_season_format=data.league.regular_season_format.value,
                start_date=data.league.start_date,
                end_date=data.league.end_date,
                logo=self._decode_logo(data.league.logo_base64),
                tracked_stats=tracked_stats,
                group_stage_config=group_stage_config,
                bracket_state=None,
                **final_phase_settings,
            )
            state, _ = build_bracket_state(league, ordered_team_ids, self.match_repo)
            state["seed_mode"] = data.seed_mode
            self.league_repo.update(
                league,
                bracket_state=state,
                final_phase_byes=required_byes(len(ordered_team_ids)),
            )
            for match in existing_matches:
                self.match_repo.delete(match)

        self.unit_of_work.expire(league, ["team_memberships"])
        return self.policy.get_existing_league(league.id)

    def reset_bracket(self, league_id: int, current_user: AuthUserOut | None = None) -> None:
        league = self._ensure_league_visible(self.policy.get_existing_league(league_id), current_user)
        had_bracket_champion = bool((league.bracket_state or {}).get("champion_team_id"))
        is_direct_elimination = str(league.competition_type) == LeagueCompetitionType.ELIMINATION.value
        bracket_matches = [
            match
            for match in self.match_repo.list(league_id=league.id)
            if getattr(match, "bracket_round", None) is not None
        ]
        with self.unit_of_work.transaction():
            for match in bracket_matches:
                self.match_repo.delete(match)
            self.league_repo.update(
                league,
                bracket_state=None,
                **(
                    {
                        "final_phase_enabled": True,
                        "final_phase_preset": "CUSTOM",
                        "final_phase_format": LeagueFinalPhaseFormat.SINGLE_ELIMINATION.value,
                        "final_phase_qualified_teams": len(league.team_ids),
                        "final_phase_byes": 0,
                        "final_phase_play_in_slots": 0,
                        "final_phase_seeded_home_advantage": False,
                        "final_phase_reseed_each_round": False,
                        "final_phase_grand_final_reset": False,
                    }
                    if is_direct_elimination
                    else {}
                ),
                **({"status": LeagueStatus.ACTIVE.value} if had_bracket_champion else {}),
            )

    def update(
        self,
        league_id: int,
        data: LeagueUpdate,
        current_user: AuthUserOut | None = None,
    ) -> League:
        league = self._ensure_league_visible(self.policy.get_existing_league(league_id), current_user)
        self._ensure_visible_team_ids(data.team_ids, current_user)
        existing_matches = self.match_repo.list(league_id=league.id)
        removed_team_ids = set(getattr(league, "team_ids", data.team_ids)) - set(data.team_ids)
        if removed_team_ids and any(
            int(match.team_a_id) in removed_team_ids or int(match.team_b_id) in removed_team_ids
            for match in existing_matches
        ):
            raise ValidationException(
                "No puedes retirar equipos que ya tienen partidos. Conserva su historial o elimina primero sus partidos."
            )
        if any(
            getattr(match, "match_date", data.start_date) < data.start_date
            or getattr(match, "match_date", data.end_date) > data.end_date
            for match in existing_matches
        ):
            raise ValidationException(
                "Las nuevas fechas dejarian partidos fuera del periodo de la competencia. Reprogramalos antes de guardar."
            )
        regular_season_format_changed = (
            str(league.competition_type) in {LeagueCompetitionType.LEAGUE.value, LeagueCompetitionType.GROUPS.value}
            and data.competition_type.value == str(league.competition_type)
            and str(league.regular_season_format) != data.regular_season_format.value
        )
        if regular_season_format_changed and existing_matches:
            if not data.confirm_regular_season_format_change:
                raise ValidationException(
                    "Esta liga ya tiene partidos. Confirma el cambio de una vuelta a ida y vuelta, o viceversa."
                )
        becoming_finished = str(getattr(league, "status", LeagueStatus.PENDING.value)) != LeagueStatus.FINISHED.value and data.status == LeagueStatus.FINISHED
        if becoming_finished and str(league.competition_type) == LeagueCompetitionType.LEAGUE.value:
            registered_team_ids = set(data.team_ids)
            required_per_pair = 2 if data.regular_season_format.value == "DOUBLE_ROUND" else 1
            pair_counts: dict[tuple[int, int], int] = {}
            unfinished_matches = 0
            for match in existing_matches:
                if str(getattr(match, "competition_stage", "REGULAR_SEASON")) == "FINAL_PHASE":
                    continue
                pair = tuple(sorted((int(match.team_a_id), int(match.team_b_id))))
                if pair[0] in registered_team_ids and pair[1] in registered_team_ids:
                    pair_counts[pair] = pair_counts.get(pair, 0) + 1
                    if str(match.status) != "finished":
                        unfinished_matches += 1
            expected_pairs = len(registered_team_ids) * (len(registered_team_ids) - 1) // 2
            covered_matches = sum(min(count, required_per_pair) for count in pair_counts.values())
            missing_matches = max(0, expected_pairs * required_per_pair - covered_matches)
            bracket_state = league.bracket_state if isinstance(league.bracket_state, dict) else {}
            final_matches = [
                match
                for match in existing_matches
                if str(getattr(match, "competition_stage", "REGULAR_SEASON")) == "FINAL_PHASE"
            ]
            unfinished_final_matches = sum(str(match.status) != "finished" for match in final_matches)
            final_phase_incomplete = bool(data.final_phase_enabled) and (
                not bracket_state
                or not bracket_state.get("champion_team_id")
                or unfinished_final_matches > 0
            )
            if (missing_matches or unfinished_matches or final_phase_incomplete) and not data.confirm_incomplete_finish:
                final_phase_message = (
                    f" La fase final sigue incompleta y tiene {unfinished_final_matches} partido(s) abierto(s)."
                    if final_phase_incomplete
                    else ""
                )
                raise ValidationException(
                    f"La liga tiene {missing_matches} cruce(s) por crear y {unfinished_matches} partido(s) regulares sin finalizar.{final_phase_message} Confirma si deseas terminarla asi."
                )
        if becoming_finished and str(league.competition_type) == LeagueCompetitionType.ELIMINATION.value:
            bracket_state = league.bracket_state if isinstance(league.bracket_state, dict) else {}
            bracket_matches = [match for match in existing_matches if getattr(match, "bracket_round", None) is not None]
            unfinished_bracket_matches = sum(str(match.status) != "finished" for match in bracket_matches)
            bracket_incomplete = not bracket_state.get("champion_team_id") or unfinished_bracket_matches > 0
            if bracket_incomplete and not data.confirm_incomplete_finish:
                raise ValidationException(
                    f"La eliminatoria aun no tiene campeon y conserva {unfinished_bracket_matches} cruce(s) abierto(s). Confirma si deseas finalizarla anticipadamente."
                )
        if becoming_finished and str(league.competition_type) == LeagueCompetitionType.GROUPS.value:
            audit = summarize_group_schedule(
                group_stage_config=league.group_stage_config,
                regular_season_format=data.regular_season_format.value,
                matches=existing_matches,
            )
            bracket_state = league.bracket_state if isinstance(league.bracket_state, dict) else {}
            final_matches = [
                match
                for match in existing_matches
                if str(getattr(match, "competition_stage", "")) == "FINAL_PHASE"
            ]
            unfinished_final_matches = sum(str(match.status) != "finished" for match in final_matches)
            final_phase_incomplete = bool(data.final_phase_enabled) and (
                not bracket_state.get("champion_team_id") or unfinished_final_matches > 0
            )
            if (
                audit["missing_matches"]
                or audit["unfinished_matches"]
                or audit["duplicate_matches"]
                or final_phase_incomplete
            ) and not data.confirm_incomplete_finish:
                raise ValidationException(
                    f"Los grupos tienen {audit['missing_matches']} cruce(s) por crear, {audit['unfinished_matches']} partido(s) sin finalizar y {audit['duplicate_matches']} duplicado(s)."
                    f" La fase final {'sigue incompleta' if final_phase_incomplete else 'no tiene pendientes'}. Confirma si deseas terminar el torneo asi."
                )
        reopening_completed_bracket = (
            str(getattr(league, "status", LeagueStatus.PENDING.value)) == LeagueStatus.FINISHED.value
            and data.status != LeagueStatus.FINISHED
            and isinstance(league.bracket_state, dict)
            and bool(league.bracket_state.get("champion_team_id"))
        )
        if reopening_completed_bracket:
            raise ValidationException("Una eliminatoria con campeon no se puede reabrir. Reinicia la llave para comenzar una estructura nueva.")
        if league.bracket_state:
            structural_change = any(
                (
                    str(league.competition_type) != data.competition_type.value,
                    bool(league.final_phase_enabled) != data.final_phase_enabled,
                    str(league.regular_season_format) != data.regular_season_format.value,
                    list(league.standings_tiebreakers or []) != [item.value for item in data.standings_tiebreakers],
                    set(league.team_ids) != set(data.team_ids),
                    str(league.final_phase_format) != data.final_phase_format.value,
                    bool(league.final_phase_two_legs) != data.final_phase_two_legs,
                    int(league.final_phase_round_best_of) != data.final_phase_round_best_of,
                    int(league.final_phase_final_best_of) != data.final_phase_final_best_of,
                    int(league.final_phase_qualified_teams) != data.final_phase_qualified_teams,
                    int(league.final_phase_byes) != data.final_phase_byes,
                    bool(league.final_phase_third_place_match) != data.final_phase_third_place_match,
                    bool(league.final_phase_seeded_home_advantage) != data.final_phase_seeded_home_advantage,
                    str(getattr(league, "final_phase_seed_mode", "STANDINGS")) != data.final_phase_seed_mode,
                    int(league.final_phase_play_in_slots) != data.final_phase_play_in_slots,
                    bool(league.final_phase_reseed_each_round) != data.final_phase_reseed_each_round,
                    bool(league.final_phase_grand_final_reset) != data.final_phase_grand_final_reset,
                )
            )
            if structural_change:
                raise ValidationException(
                    "La fase regular esta cerrada. Reinicia la llave antes de cambiar tabla, equipos o reglas de clasificacion."
                )
        tracked_stats, team_ids, final_phase_settings, group_stage_config = self.policy.prepare_payload(
            name=data.name,
            start_date=data.start_date,
            end_date=data.end_date,
            tracked_stats=data.tracked_stats,
            team_ids=data.team_ids,
            competition_type=data.competition_type,
            final_phase_enabled=data.final_phase_enabled,
            final_phase_preset=data.final_phase_preset,
            final_phase_qualified_teams=data.final_phase_qualified_teams,
            final_phase_byes=data.final_phase_byes,
            final_phase_format=data.final_phase_format,
            final_phase_two_legs=data.final_phase_two_legs,
            final_phase_third_place_match=data.final_phase_third_place_match,
            final_phase_seeded_home_advantage=data.final_phase_seeded_home_advantage,
            final_phase_seed_mode=data.final_phase_seed_mode,
            final_phase_play_in_slots=data.final_phase_play_in_slots,
            final_phase_round_best_of=data.final_phase_round_best_of,
            final_phase_final_best_of=data.final_phase_final_best_of,
            final_phase_reseed_each_round=data.final_phase_reseed_each_round,
            final_phase_grand_final_reset=data.final_phase_grand_final_reset,
            group_stage_config=data.group_stage_config,
            current_league_id=league.id,
        )

        current_competition_type = str(league.competition_type)
        involves_group_stage = (
            current_competition_type == LeagueCompetitionType.GROUPS.value
            or data.competition_type == LeagueCompetitionType.GROUPS
        )
        group_structure_changed = (
            current_competition_type != data.competition_type.value
            or (getattr(league, "group_stage_config", None) or None) != group_stage_config
        )
        current_group_config = getattr(league, "group_stage_config", None)
        group_distribution_changed = (
            current_competition_type == LeagueCompetitionType.GROUPS.value
            and isinstance(current_group_config, dict)
            and (
                current_group_config.get("mode") != (group_stage_config or {}).get("mode")
                or current_group_config.get("groups") != (group_stage_config or {}).get("groups")
            )
        )
        if group_distribution_changed:
            raise ValidationException(
                "Los grupos ya quedaron confirmados. Su cantidad y equipos no se pueden modificar despues del primer guardado."
            )
        group_rules_changed = (
            current_competition_type == LeagueCompetitionType.GROUPS.value
            and (
                str(league.regular_season_format) != data.regular_season_format.value
                or list(league.standings_tiebreakers or []) != [item.value for item in data.standings_tiebreakers]
                or (current_group_config or None) != group_stage_config
            )
        )
        if existing_matches and group_rules_changed:
            raise ValidationException(
                "La fase de grupos ya inicio. Sus vueltas, clasificacion y desempates quedaron bloqueados."
            )
        if existing_matches and involves_group_stage and group_structure_changed:
            raise ValidationException(
                "Esta competencia ya tiene partidos. Elimina sus partidos antes de cambiar el formato o la distribucion de grupos."
            )

        with self.unit_of_work.transaction():
            self.league_membership_repo.replace_team_ids_for_league(league.id, team_ids)
            self.league_repo.update(
                league,
                name=data.name,
                responsible_name=data.responsible_name,
                responsible_email=data.responsible_email,
                category=data.category,
                status=data.status.value,
                regular_season_format=data.regular_season_format.value,
                standings_tiebreakers=[item.value for item in data.standings_tiebreakers],
                start_date=data.start_date,
                end_date=data.end_date,
                logo=self._decode_logo(data.logo_base64),
                tracked_stats=tracked_stats,
                group_stage_config=group_stage_config,
                **final_phase_settings,
            )

        return self.policy.get_existing_league(league.id)

    def replace_team_assignments(
        self,
        league_id: int,
        data: LeagueTeamAssignmentsUpdate,
        current_user: AuthUserOut | None = None,
    ) -> League:
        league = self._ensure_league_visible(self.policy.get_existing_league(league_id), current_user)
        self._ensure_visible_team_ids(data.team_ids, current_user)
        if (
            str(league.competition_type) == LeagueCompetitionType.GROUPS.value
            and league.group_stage_config is not None
            and set(data.team_ids) != set(league.team_ids)
        ):
            raise ValidationException(
                "Los grupos ya estan configurados. Edita su distribucion desde Configurar modo para mantener cada equipo asignado."
            )
        if league.bracket_state and set(data.team_ids) != set(league.team_ids):
            raise ValidationException("Reinicia la llave actual antes de modificar los equipos inscritos.")
        removed_team_ids = set(league.team_ids) - set(data.team_ids)
        if removed_team_ids:
            used_team_ids = {
                team_id
                for match in self.match_repo.list(league_id=league.id)
                for team_id in (int(match.team_a_id), int(match.team_b_id))
            }
            if removed_team_ids & used_team_ids:
                raise ValidationException(
                    "No puedes retirar equipos que ya tienen partidos. Conserva su historial o elimina primero sus partidos."
                )
        team_ids = self.policy.resolve_team_ids(data.team_ids)
        normalized_final_phase = self.policy.validate_final_phase_for_team_assignments(league=league, team_ids=team_ids)

        with self.unit_of_work.transaction():
            self.league_membership_repo.replace_team_ids_for_league(league.id, team_ids)
            if normalized_final_phase:
                self.league_repo.update(league, **normalized_final_phase)

        return self.policy.get_existing_league(league.id)

    def delete(self, league_id: int, current_user: AuthUserOut | None = None) -> None:
        league = self._ensure_league_visible(self.policy.get_existing_league(league_id), current_user)
        with self.unit_of_work.transaction():
            self.league_repo.delete(league)
