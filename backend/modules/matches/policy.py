from core.exceptions import NotFoundException
from modules.matches.domain import resolve_match_result, validate_match_schedule, validate_match_teams
from modules.matches.repositories import MatchRepository

from .schemas import MatchCreate, MatchUpdate


class MatchPolicy:
    def __init__(self, match_repo: MatchRepository):
        self.match_repo = match_repo

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

    def resolve_create_result(self, data: MatchCreate):
        validate_match_schedule(data.start_time, data.end_time)
        self.ensure_teams_exist(data.team_a_id, data.team_b_id, data.winner_team_id)
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
        return resolve_match_result(
            team_a_id=data.team_a_id,
            team_b_id=data.team_b_id,
            score_team_a=data.score_team_a,
            score_team_b=data.score_team_b,
            winner_team_id=data.winner_team_id,
            is_draw=data.is_draw,
        )
