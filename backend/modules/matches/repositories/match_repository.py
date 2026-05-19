from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.orm import Match, Team
from modules.matches.domain import MatchScoreState, MatchStatus


class MatchRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, match: Match) -> Match:
        self.db.add(match)
        return match

    def delete(self, match: Match) -> None:
        self.db.delete(match)

    def update(self, match: Match, **fields) -> Match:
        for key, value in fields.items():
            setattr(match, key, value)
        self.db.flush()
        return match

    def update_status(self, match: Match, status: MatchStatus) -> Match:
        return self.update(match, status=status.value)

    def apply_score_state(self, match: Match, score_state: MatchScoreState) -> Match:
        return self.update(
            match,
            score_team_a=score_state.score_team_a,
            score_team_b=score_state.score_team_b,
            winner_team_id=score_state.winner_team_id,
            is_draw=score_state.is_draw,
        )

    def get(self, match_id: int) -> Optional[Match]:
        statement = (
            select(Match)
            .options(
                selectinload(Match.team_a),
                selectinload(Match.team_b),
                selectinload(Match.winner_team),
                selectinload(Match.league),
            )
            .where(Match.id == match_id)
        )
        return self.db.scalar(statement)

    def list(self, league_id: int | None = None) -> list[Match]:
        statement = (
            select(Match)
            .options(
                selectinload(Match.team_a),
                selectinload(Match.team_b),
                selectinload(Match.winner_team),
                selectinload(Match.league),
            )
        )
        if league_id is not None:
            statement = statement.where(Match.league_id == league_id)
        statement = statement.order_by(Match.match_date.desc(), Match.start_time.desc(), Match.id.desc())
        return list(self.db.scalars(statement).all())

    def list_by_ids(self, match_ids: list[int]) -> list[Match]:
        if not match_ids:
            return []

        statement = (
            select(Match)
            .options(
                selectinload(Match.team_a),
                selectinload(Match.team_b),
                selectinload(Match.winner_team),
                selectinload(Match.league),
            )
            .where(Match.id.in_(match_ids))
            .order_by(Match.match_date.desc(), Match.start_time.desc(), Match.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_existing_team_ids(self, team_ids: list[int]) -> set[int]:
        if not team_ids:
            return set()
        statement = select(Team.id).where(Team.id.in_(team_ids))
        return set(self.db.scalars(statement).all())
