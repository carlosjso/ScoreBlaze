from __future__ import annotations

from fastapi import HTTPException, UploadFile, status
from openpyxl import load_workbook

from data.orm import Match, PlayerStat, TeamStat, MatchEvent
from database.unit_of_work import UnitOfWork

from modules.matches.domain import MatchResult
from modules.matches.repositories import MatchRepository

from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository
from modules.memberships.repositories import MembershipRepository

from modules.statistics.repositories.player_stat_repository import (
    PlayerStatRepository,
)
from modules.statistics.repositories.team_stat_repository import (
    TeamStatRepository,
)

from modules.match_events.repositories import MatchEventRepository
from modules.match_events.event_builder import EventBuilder
from .policy import MatchPolicy
from .schemas import MatchCreate, MatchPatch, MatchUpdate

from modules.match_events.domain import MatchEventStatus, MatchEventType

class MatchService:
    def __init__(
        self,
        match_repo: MatchRepository,
        player_repo: PlayerRepository,
        team_repo: TeamRepository,
        membership_repo: MembershipRepository,
        player_stat_repo: PlayerStatRepository,
        team_stat_repo: TeamStatRepository,
        match_event_repo: MatchEventRepository,
        unit_of_work: UnitOfWork,
        policy: MatchPolicy,
    ):
        self.match_repo = match_repo
        self.player_repo = player_repo
        self.team_repo = team_repo
        self.membership_repo = membership_repo
        self.player_stat_repo = player_stat_repo
        self.team_stat_repo = team_stat_repo
        self.match_event_repo = match_event_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    @staticmethod
    def _build_match(data: MatchCreate, result: MatchResult) -> Match:
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
            status=data.status.value,
        )

    def create(self, data: MatchCreate) -> Match:
        result = self.policy.resolve_create_result(data)
        match = self._build_match(data, result)

        with self.unit_of_work.transaction():
            self.match_repo.add(match)

        self.unit_of_work.refresh(match)
        return match

    def list(self, league_id: int | None = None) -> list[Match]:
        return self.match_repo.list(league_id=league_id)

    def get(self, match_id: int) -> Match:
        return self.policy.get_existing_match(match_id)
    def _create_player_events(
        self,
        match_id: int,
        team_id: int,
        player_id: int,
        player_data: dict,
        event_order: int,
    ) -> int:

        def add_event(event_type: str, times: int):
            nonlocal event_order

            for _ in range(times or 0):
                match_event = MatchEvent(
                    match_id=match_id,
                    team_id=team_id,
                    player_id=player_id,
                    event_type=event_type,
                    period=1,
                    elapsed_seconds=0,
                    event_order=event_order,
                    status=MatchEventStatus.ACTIVE.value,
                )

                self.match_event_repo.add(match_event)
                event_order += 1

        # ======================
        # EVENTOS DESDE BUILDER
        # ======================

        for event_type, qty in EventBuilder.build_player_events(player_data):
            add_event(event_type, qty)

        # ======================
        # MISSES
        # ======================

        misses = EventBuilder.calculate_misses(player_data)
        add_event(MatchEventType.MISS.value, misses)

        return event_order

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
            status=match.status,
        )

    @staticmethod
    def _merge_patch(match: Match, data: MatchPatch) -> MatchUpdate:
        current = MatchService._update_from_match(match)

        patched = current.model_copy(
            update=data.model_dump(exclude_unset=True)
        )

        return MatchUpdate.model_validate(patched.model_dump())

    def _apply_update(self, match: Match, data: MatchUpdate) -> Match:
        result = self.policy.resolve_update_result(data)

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
                status=data.status.value,
            )

        self.unit_of_work.refresh(match)
        return match

    def update(self, match_id: int, data: MatchUpdate) -> Match:
        match = self.policy.get_existing_match(match_id)
        return self._apply_update(match, data)

    def patch(self, match_id: int, data: MatchPatch) -> Match:
        match = self.policy.get_existing_match(match_id)

        return self._apply_update(
            match,
            self._merge_patch(match, data),
        )

    def delete(self, match_id: int) -> None:
        match = self.policy.get_existing_match(match_id)

        with self.unit_of_work.transaction():
            self.match_repo.delete(match)

    def import_match_data(self, match_id: int, file: UploadFile):
        match = self.policy.get_existing_match(match_id)

        workbook = load_workbook(file.file, data_only=True)
        worksheet = workbook.active

        team_a_name = worksheet["C11"].value
        team_b_name = worksheet["C12"].value

        team_a = self.team_repo.get_by_name(team_a_name)
        team_b = self.team_repo.get_by_name(team_b_name)

        if not team_a:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team not found: {team_a_name}",
            )

        if not team_b:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team not found: {team_b_name}",
            )

        team_a_players = []

        for row in range(27, 42):
            player_name = worksheet[f"B{row}"].value
            jersey_number = worksheet[f"C{row}"].value
            fouls = int(worksheet[f"D{row}"].value or 0)
            t1 = int(worksheet[f"E{row}"].value or 0)
            t2 = int(worksheet[f"F{row}"].value or 0)
            t3 = int(worksheet[f"G{row}"].value or 0)
            attempts = int(worksheet[f"H{row}"].value or 0)
            assists = int(worksheet[f"I{row}"].value or 0)
            rebounds = int(worksheet[f"J{row}"].value or 0)
            steals = int(worksheet[f"K{row}"].value or 0)
            blocks = int(worksheet[f"L{row}"].value or 0)
            points = int(worksheet[f"M{row}"].value or 0)

            if not player_name:
                continue

            player = self.player_repo.get_by_name(player_name)

            if not player:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Player not found: {player_name}",
                )

            membership = self.membership_repo.get_by_player_and_team(
                player.id,
                team_a.id,
            )

            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Player {player_name} is not member of {team_a.name}",
                )

            team_a_players.append({
                "player_id": player.id,
                "name": player.name,
                "jersey_number": jersey_number,
                "fouls": fouls,
                "t1": t1,
                "t2": t2,
                "t3": t3,
                "attempts": attempts,
                "assists": assists,
                "rebounds": rebounds,
                "steals": steals,
                "blocks": blocks,
                "points": points,
            })

        team_b_players = []

        for row in range(47, 62):
            player_name = worksheet[f"B{row}"].value
            jersey_number = worksheet[f"C{row}"].value
            fouls = int(worksheet[f"D{row}"].value or 0)
            t1 = int(worksheet[f"E{row}"].value or 0)
            t2 = int(worksheet[f"F{row}"].value or 0)
            t3 = int(worksheet[f"G{row}"].value or 0)
            attempts = int(worksheet[f"H{row}"].value or 0)
            assists = int(worksheet[f"I{row}"].value or 0)
            rebounds = int(worksheet[f"J{row}"].value or 0)
            steals = int(worksheet[f"K{row}"].value or 0)
            blocks = int(worksheet[f"L{row}"].value or 0)
            points = int(worksheet[f"M{row}"].value or 0)

            if not player_name:
                continue

            player = self.player_repo.get_by_name(player_name)

            if not player:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Player not found: {player_name}",
                )

            membership = self.membership_repo.get_by_player_and_team(
                player.id,
                team_b.id,
            )

            if not membership:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Player {player_name} is not member of {team_b.name}",
                )

            team_b_players.append({
                "player_id": player.id,
                "name": player.name,
                "jersey_number": jersey_number,
                "fouls": fouls,
                "t1": t1,
                "t2": t2,
                "t3": t3,
                "attempts": attempts,
                "assists": assists,
                "rebounds": rebounds,
                "steals": steals,
                "blocks": blocks,
                "points": points,
            })

        # =====================
        # SAVE STATS
        # =====================

        if self.match_event_repo.exists_for_match(match.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Match stats already imported",
            )

        with self.unit_of_work.transaction():

            event_order = 1

            # =====================
            # TEAM A PLAYERS
            # =====================

            for player_data in team_a_players:

                player_stat = self.player_stat_repo.get_by_player_id(
                    player_data["player_id"]
                )

                if not player_stat:

                    player_stat = PlayerStat(
                        player_id=player_data["player_id"],
                        matches_played=1,
                        total_points=player_data["points"],
                    )

                    self.player_stat_repo.add(player_stat)

                else:

                    self.player_stat_repo.update(
                        player_stat,
                        matches_played=player_stat.matches_played + 1,
                        total_points=player_stat.total_points + player_data["points"],
                    )

                # =========================
                # MATCH EVENTS (OPTIMIZADO)
                # =========================

                event_order = self._create_player_events(
                    match.id,
                    team_a.id,
                    player_data["player_id"],
                    player_data,
                    event_order,
                )             

            # =====================
            # TEAM B PLAYERS
            # =====================

            for player_data in team_b_players:

                player_stat = self.player_stat_repo.get_by_player_id(
                    player_data["player_id"]
                )

                if not player_stat:

                    player_stat = PlayerStat(
                        player_id=player_data["player_id"],
                        matches_played=1,
                        total_points=player_data["points"],
                    )

                    self.player_stat_repo.add(player_stat)

                else:

                    self.player_stat_repo.update(
                        player_stat,
                        matches_played=(
                            player_stat.matches_played + 1
                        ),
                        total_points=(
                            player_stat.total_points
                            + player_data["points"]
                        ),
                    )

                # CREATE MATCH EVENTS
                event_order = self._create_player_events(
                    match.id,
                    team_b.id,
                    player_data["player_id"],
                    player_data,
                    event_order,
                ) 

            # =====================
            # TEAM A STATS
            # =====================

            team_a_stat = self.team_stat_repo.get(team_a.id)

            team_a_score = int(worksheet["B64"].value or 0)
            team_b_score = int(worksheet["E64"].value or 0)

            team_a_wins = 1 if team_a_score > team_b_score else 0
            team_a_losses = 1 if team_a_score < team_b_score else 0
            team_a_draws = 1 if team_a_score == team_b_score else 0

            if not team_a_stat:

                team_a_stat = TeamStat(
                    team_id=team_a.id,
                    matches_played=1,
                    wins=team_a_wins,
                    losses=team_a_losses,
                    draws=team_a_draws,
                    points_for=team_a_score,
                    points_against=team_b_score,
                    points_difference=team_a_score - team_b_score,
                    standings_points=(
                        (team_a_wins * 3)
                        + team_a_draws
                    ),
                )

                self.team_stat_repo.add(team_a_stat)

            else:

                self.team_stat_repo.update(
                    team_a_stat,
                    matches_played=(
                        team_a_stat.matches_played + 1
                    ),
                    wins=team_a_stat.wins + team_a_wins,
                    losses=(
                        team_a_stat.losses + team_a_losses
                    ),
                    draws=team_a_stat.draws + team_a_draws,
                    points_for=(
                        team_a_stat.points_for + team_a_score
                    ),
                    points_against=(
                        team_a_stat.points_against
                        + team_b_score
                    ),
                    points_difference=(
                        team_a_stat.points_difference
                        + (team_a_score - team_b_score)
                    ),
                    standings_points=(
                        team_a_stat.standings_points
                        + (team_a_wins * 3)
                        + team_a_draws
                    ),
                )

            # =====================
            # TEAM B STATS
            # =====================

            team_b_stat = self.team_stat_repo.get(team_b.id)

            team_b_wins = 1 if team_b_score > team_a_score else 0
            team_b_losses = 1 if team_b_score < team_a_score else 0
            team_b_draws = 1 if team_b_score == team_a_score else 0

            if not team_b_stat:

                team_b_stat = TeamStat(
                    team_id=team_b.id,
                    matches_played=1,
                    wins=team_b_wins,
                    losses=team_b_losses,
                    draws=team_b_draws,
                    points_for=team_b_score,
                    points_against=team_a_score,
                    points_difference=(
                        team_b_score - team_a_score
                    ),
                    standings_points=(
                        (team_b_wins * 3)
                        + team_b_draws
                    ),
                )

                self.team_stat_repo.add(team_b_stat)

            else:

                self.team_stat_repo.update(
                    team_b_stat,
                    matches_played=(
                        team_b_stat.matches_played + 1
                    ),
                    wins=team_b_stat.wins + team_b_wins,
                    losses=(
                        team_b_stat.losses + team_b_losses
                    ),
                    draws=team_b_stat.draws + team_b_draws,
                    points_for=(
                        team_b_stat.points_for + team_b_score
                    ),
                    points_against=(
                        team_b_stat.points_against
                        + team_a_score
                    ),
                    points_difference=(
                        team_b_stat.points_difference
                        + (team_b_score - team_a_score)
                    ),
                    standings_points=(
                        team_b_stat.standings_points
                        + (team_b_wins * 3)
                        + team_b_draws
                    ),
                )
        data = {
            "match_id": match.id,
            "competition": worksheet["C5"].value,
            "match_number": worksheet["C6"].value,
            "date": worksheet["C7"].value,

            "team_a": {
                "id": team_a.id,
                "name": team_a.name,
            },

            "team_b": {
                "id": team_b.id,
                "name": team_b.name,
            },

            "coach_a": worksheet["B25"].value,
            "coach_b": worksheet["B45"].value,

            "team_a_score": worksheet["B64"].value,
            "team_b_score": worksheet["E64"].value,

            "team_a_players": team_a_players,
            "team_b_players": team_b_players,
        }

        return data