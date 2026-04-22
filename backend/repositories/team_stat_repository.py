from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.entities import Team, TeamStat


class TeamStatRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: TeamStat) -> TeamStat:
        self.db.add(entity)
        return entity

    def delete(self, entity: TeamStat) -> None:
        self.db.delete(entity)

    def get(self, team_id: int) -> Optional[TeamStat]:
        stmt = select(TeamStat).where(TeamStat.team_id == team_id)
        return self.db.scalar(stmt)

    def list(self) -> list[TeamStat]:
        stmt = select(TeamStat).order_by(TeamStat.team_id.asc())
        return list(self.db.scalars(stmt).all())

    def get_existing_team_ids(self, team_ids: list[int]) -> set[int]:
        if not team_ids:
            return set()
        stmt = select(Team.id).where(Team.id.in_(team_ids))
        return set(self.db.scalars(stmt).all())
