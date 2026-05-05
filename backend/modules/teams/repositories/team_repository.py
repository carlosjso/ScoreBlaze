from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.orm import Team


class TeamRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, team: Team) -> Team:
        self.db.add(team)
        return team

    def delete(self, team: Team) -> None:
        self.db.delete(team)

    def update(self, team: Team, **fields) -> Team:
        for key, value in fields.items():
            setattr(team, key, value)
        self.db.flush()
        return team

    def get(self, team_id: int) -> Optional[Team]:
        statement = (
            select(Team)
            .options(selectinload(Team.team_memberships))
            .where(Team.id == team_id)
        )
        return self.db.scalar(statement)

    def list(self) -> list[Team]:
        statement = select(Team).options(selectinload(Team.team_memberships)).order_by(Team.id.asc())
        return list(self.db.scalars(statement).all())

    def get_by_name(self, name: str) -> Optional[Team]:
        statement = select(Team).where(Team.name == name)
        return self.db.scalar(statement)

    def get_many_by_ids(self, ids: list[int]) -> list[Team]:
        if not ids:
            return []
        statement = select(Team).options(selectinload(Team.team_memberships)).where(Team.id.in_(ids))
        return list(self.db.scalars(statement).all())
