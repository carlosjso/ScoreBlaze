from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.entities import Match, Team


class MatchRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: Match) -> Match:
        self.db.add(entity)
        return entity

    def delete(self, entity: Match) -> None:
        self.db.delete(entity)

    def get(self, match_id: int) -> Optional[Match]:
        stmt = (
            select(Match)
            .options(
                selectinload(Match.team_a),
                selectinload(Match.team_b),
                selectinload(Match.winner_team),
            )
            .where(Match.id == match_id)
        )
        return self.db.scalar(stmt)

    def list(self) -> list[Match]:
        stmt = (
            select(Match)
            .options(
                selectinload(Match.team_a),
                selectinload(Match.team_b),
                selectinload(Match.winner_team),
            )
            .order_by(Match.match_date.desc(), Match.start_time.desc(), Match.id.desc())
        )
        return list(self.db.scalars(stmt).all())

    def get_existing_team_ids(self, team_ids: list[int]) -> set[int]:
        if not team_ids:
            return set()
        stmt = select(Team.id).where(Team.id.in_(team_ids))
        return set(self.db.scalars(stmt).all())
