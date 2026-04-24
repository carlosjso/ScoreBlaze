from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.entities import Team


class TeamRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: Team) -> Team:
        self.db.add(entity)
        return entity

    def delete(self, entity: Team) -> None:
        self.db.delete(entity)

    def get(self, team_id: int) -> Optional[Team]:
        stmt = (
            select(Team)
            .options(selectinload(Team.team_memberships))
            .where(Team.id == team_id)
        )
        return self.db.scalar(stmt)

    def list(self) -> list[Team]:
        stmt = select(Team).options(selectinload(Team.team_memberships)).order_by(Team.id.asc())
        return list(self.db.scalars(stmt).all())

    def get_by_name(self, name: str) -> Optional[Team]:
        stmt = select(Team).where(Team.name == name)
        return self.db.scalar(stmt)

    def get_many_by_ids(self, ids: list[int]) -> list[Team]:
        if not ids:
            return []
        stmt = select(Team).options(selectinload(Team.team_memberships)).where(Team.id.in_(ids))
        return list(self.db.scalars(stmt).all())
