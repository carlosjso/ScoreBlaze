from core.exceptions import NotFoundException
from modules.matches.repositories import MatchRepository


class ScoreboardPolicy:
    def __init__(self, match_repo: MatchRepository):
        self.match_repo = match_repo

    def get_existing_match(self, match_id: int):
        match = self.match_repo.get(match_id)
        if not match:
            raise NotFoundException("Match not found")
        return match
