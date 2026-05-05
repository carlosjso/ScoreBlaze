from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.orm import Team, TeamStat


class TeamStatRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, team_stat: TeamStat) -> TeamStat:
        self.db.add(team_stat)
        return team_stat

    def delete(self, team_stat: TeamStat) -> None:
        self.db.delete(team_stat)

    def update(self, team_stat: TeamStat, **fields) -> TeamStat:
        for key, value in fields.items():
            setattr(team_stat, key, value)
        self.db.flush()
        return team_stat

    def get(self, team_id: int) -> Optional[TeamStat]:
        statement = select(TeamStat).where(TeamStat.team_id == team_id)
        return self.db.scalar(statement)

    def list(self) -> list[TeamStat]:
        statement = select(TeamStat).order_by(TeamStat.team_id.asc())
        return list(self.db.scalars(statement).all())

    def get_existing_team_ids(self, team_ids: list[int]) -> set[int]:
        if not team_ids:
            return set()
        statement = select(Team.id).where(Team.id.in_(team_ids))
        return set(self.db.scalars(statement).all())
