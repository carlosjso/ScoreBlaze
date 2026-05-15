from __future__ import annotations

from core.exceptions import ConflictException, NotFoundException
from modules.teams.repositories import TeamRepository

from .domain import normalize_tracked_stats, validate_league_schedule
from .repositories import LeagueRepository


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
        current_league_id: int | None = None,
    ) -> tuple[list[str], list[int]]:
        self.ensure_name_available(name, current_league_id=current_league_id)
        validate_league_schedule(start_date, end_date)
        return normalize_tracked_stats(tracked_stats), self.resolve_team_ids(team_ids)
