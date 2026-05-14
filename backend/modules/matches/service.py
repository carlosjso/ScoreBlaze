from __future__ import annotations

from fastapi import HTTPException, UploadFile, status
from openpyxl import load_workbook

from data.orm import Match
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

from .policy import MatchPolicy
from .schemas import MatchCreate, MatchPatch, MatchUpdate


class MatchService:
    def __init__(
        self,
        match_repo: MatchRepository,
        player_repo: PlayerRepository,
        team_repo: TeamRepository,
        membership_repo: MembershipRepository,
        player_stat_repo: PlayerStatRepository,
        team_stat_repo: TeamStatRepository,
        unit_of_work: UnitOfWork,
        policy: MatchPolicy,
    ):
        self.match_repo = match_repo
        self.player_repo = player_repo
        self.team_repo = team_repo
        self.membership_repo = membership_repo
        self.player_stat_repo = player_stat_repo
        self.team_stat_repo = team_stat_repo
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

        return MatchUpdate.model_validate(
            patched.model_dump()
        )

    def _apply_update(
        self,
        match: Match,
        data: MatchUpdate,
    ) -> Match:
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

    def update(
        self,
        match_id: int,
        data: MatchUpdate,
    ) -> Match:
        match = self.policy.get_existing_match(match_id)

        return self._apply_update(match, data)

    def patch(
        self,
        match_id: int,
        data: MatchPatch,
    ) -> Match:
        match = self.policy.get_existing_match(match_id)

        return self._apply_update(
            match,
            self._merge_patch(match, data),
        )

    def delete(self, match_id: int) -> None:
        match = self.policy.get_existing_match(match_id)

        with self.unit_of_work.transaction():
            self.match_repo.delete(match)

    def import_match_data(
        self,
        file: UploadFile,
    ):
        workbook = load_workbook(file.file)

        worksheet = workbook.active

        team_a_name = worksheet["C12"].value
        team_b_name = worksheet["C13"].value

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
            points = worksheet[f"K{row}"].value or 0

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
                    detail=(
                        f"Player {player_name} "
                        f"is not member of {team_a.name}"
                    ),
                )

            team_a_players.append({
                "player_id": player.id,
                "name": player.name,
                "jersey_number": jersey_number,
                "points": points,
            })

        team_b_players = []

        for row in range(47, 62):
            player_name = worksheet[f"B{row}"].value
            jersey_number = worksheet[f"C{row}"].value
            points = worksheet[f"K{row}"].value or 0

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
                    detail=(
                        f"Player {player_name} "
                        f"is not member of {team_b.name}"
                    ),
                )

            team_b_players.append({
                "player_id": player.id,
                "name": player.name,
                "jersey_number": jersey_number,
                "points": points,
            })

        data = {
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