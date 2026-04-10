from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.entities import Player


class PlayerRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: Player) -> Player:
        self.db.add(entity)
        return entity

    def delete(self, entity: Player) -> None:
        self.db.delete(entity)

    def get(self, player_id: int) -> Optional[Player]:
        stmt = (
            select(Player)
            .options(selectinload(Player.team_links))
            .where(Player.id == player_id)
        )
        return self.db.scalar(stmt)

    def list(self) -> list[Player]:
        stmt = select(Player).options(selectinload(Player.team_links)).order_by(Player.id.asc())
        return list(self.db.scalars(stmt).all())

    def get_by_email(self, email: str) -> Optional[Player]:
        stmt = select(Player).where(Player.email == email)
        return self.db.scalar(stmt)

    def get_many_by_ids(self, ids: list[int]) -> list[Player]:
        if not ids:
            return []
        stmt = select(Player).options(selectinload(Player.team_links)).where(Player.id.in_(ids))
        return list(self.db.scalars(stmt).all())
