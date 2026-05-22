from __future__ import annotations

from core.pagination import paginate_sequence
from data.orm import League
from database.unit_of_work import UnitOfWork
from modules.matches.repositories import MatchRepository
from modules.teams.repositories import TeamRepository
from utils.media import decode_base64_payload

from .policy import LeaguePolicy
from .repositories import LeagueMembershipRepository, LeagueRepository
from .schemas import (
    LeagueCreate,
    LeagueDetailOut,
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
    ):
        self.league_repo = league_repo
        self.team_repo = team_repo
        self.league_membership_repo = league_membership_repo
        self.match_repo = match_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _decode_logo(logo_base64: str | None) -> bytes | None:
        return decode_base64_payload(logo_base64, "Invalid league logo. Could not decode Base64")

    def create(self, data: LeagueCreate) -> League:
        tracked_stats, team_ids, final_phase_settings = self.policy.prepare_payload(
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
            final_phase_play_in_slots=data.final_phase_play_in_slots,
            final_phase_round_best_of=data.final_phase_round_best_of,
            final_phase_final_best_of=data.final_phase_final_best_of,
            final_phase_reseed_each_round=data.final_phase_reseed_each_round,
            final_phase_grand_final_reset=data.final_phase_grand_final_reset,
        )

        league = League(
            name=data.name,
            responsible_name=data.responsible_name,
            responsible_email=data.responsible_email,
            category=data.category,
            status=data.status.value,
            start_date=data.start_date,
            end_date=data.end_date,
            logo=self._decode_logo(data.logo_base64),
            tracked_stats=tracked_stats,
            **final_phase_settings,
        )

        with self.unit_of_work.transaction():
            self.league_repo.add(league)
            self.unit_of_work.flush()
            self.league_membership_repo.replace_team_ids_for_league(league.id, team_ids)

        return self.policy.get_existing_league(league.id)

    def list(self, *, competition_type: str | None = None) -> list[League]:
        leagues = self.league_repo.list()
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
    ) -> PaginatedLeaguesTableOut:
        leagues = self.league_repo.list()
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
                        responsible_name=league.responsible_name,
                        responsible_email=league.responsible_email,
                        start_date=league.start_date,
                        end_date=league.end_date,
                        logo_base64=league.logo_base64,
                        tracked_stats=list(league.tracked_stats or []),
                        final_phase_enabled=bool(league.final_phase_enabled),
                        final_phase_preset=league.final_phase_preset,
                        final_phase_qualified_teams=int(league.final_phase_qualified_teams or 0),
                        final_phase_byes=int(league.final_phase_byes or 0),
                        final_phase_format=league.final_phase_format,
                        final_phase_two_legs=bool(league.final_phase_two_legs),
                        final_phase_third_place_match=bool(league.final_phase_third_place_match),
                        final_phase_seeded_home_advantage=bool(league.final_phase_seeded_home_advantage),
                        final_phase_play_in_slots=int(league.final_phase_play_in_slots or 0),
                        final_phase_round_best_of=int(league.final_phase_round_best_of or 1),
                        final_phase_final_best_of=int(league.final_phase_final_best_of or 1),
                        final_phase_reseed_each_round=bool(league.final_phase_reseed_each_round),
                        final_phase_grand_final_reset=bool(league.final_phase_grand_final_reset),
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

    def get(self, league_id: int) -> LeagueDetailOut:
        league = self.policy.get_existing_league(league_id)
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
            start_date=league.start_date,
            end_date=league.end_date,
            tracked_stats=list(league.tracked_stats or []),
            final_phase_enabled=bool(league.final_phase_enabled),
            final_phase_preset=league.final_phase_preset,
            final_phase_qualified_teams=int(league.final_phase_qualified_teams or 0),
            final_phase_byes=int(league.final_phase_byes or 0),
            final_phase_format=league.final_phase_format,
            final_phase_two_legs=bool(league.final_phase_two_legs),
            final_phase_third_place_match=bool(league.final_phase_third_place_match),
            final_phase_seeded_home_advantage=bool(league.final_phase_seeded_home_advantage),
            final_phase_play_in_slots=int(league.final_phase_play_in_slots or 0),
            final_phase_round_best_of=int(league.final_phase_round_best_of or 1),
            final_phase_final_best_of=int(league.final_phase_final_best_of or 1),
            final_phase_reseed_each_round=bool(league.final_phase_reseed_each_round),
            final_phase_grand_final_reset=bool(league.final_phase_grand_final_reset),
            logo_base64=league.logo_base64,
            team_ids=league.team_ids,
            teams=teams,
            matches_count=matches_count,
        )

    def list_matches(self, league_id: int):
        league = self.policy.get_existing_league(league_id)
        return self.match_repo.list(league_id=league.id)

    def update(self, league_id: int, data: LeagueUpdate) -> League:
        league = self.policy.get_existing_league(league_id)
        tracked_stats, team_ids, final_phase_settings = self.policy.prepare_payload(
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
            final_phase_play_in_slots=data.final_phase_play_in_slots,
            final_phase_round_best_of=data.final_phase_round_best_of,
            final_phase_final_best_of=data.final_phase_final_best_of,
            final_phase_reseed_each_round=data.final_phase_reseed_each_round,
            final_phase_grand_final_reset=data.final_phase_grand_final_reset,
            current_league_id=league.id,
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
                start_date=data.start_date,
                end_date=data.end_date,
                logo=self._decode_logo(data.logo_base64),
                tracked_stats=tracked_stats,
                **final_phase_settings,
            )

        return self.policy.get_existing_league(league.id)

    def replace_team_assignments(self, league_id: int, data: LeagueTeamAssignmentsUpdate) -> League:
        league = self.policy.get_existing_league(league_id)
        team_ids = self.policy.resolve_team_ids(data.team_ids)
        self.policy.validate_final_phase_for_team_assignments(league=league, team_count=len(team_ids))

        with self.unit_of_work.transaction():
            self.league_membership_repo.replace_team_ids_for_league(league.id, team_ids)

        return self.policy.get_existing_league(league.id)

    def delete(self, league_id: int) -> None:
        league = self.policy.get_existing_league(league_id)
        with self.unit_of_work.transaction():
            self.league_repo.delete(league)
