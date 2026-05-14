from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.orm import Player


class PlayerRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, player: Player) -> Player:
        self.db.add(player)
        return player

    def delete(self, player: Player) -> None:
        self.db.delete(player)

    def update(self, player: Player, **fields) -> Player:
        for key, value in fields.items():
            setattr(player, key, value)
        self.db.flush()
        return player

    def get(self, player_id: int) -> Optional[Player]:
        statement = (
            select(Player)
            .options(selectinload(Player.team_memberships))
            .where(Player.id == player_id)
        )
        return self.db.scalar(statement)

    def list(self) -> list[Player]:
        statement = (
            select(Player)
            .options(selectinload(Player.team_memberships))
            .order_by(Player.id.asc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_email(self, email: str) -> Optional[Player]:
        statement = select(Player).where(Player.email == email)
        return self.db.scalar(statement)

    # NUEVO
    def get_by_name(self, name: str) -> Optional[Player]:
        statement = select(Player).where(Player.name == name)
        return self.db.scalar(statement)

    def get_many_by_ids(self, ids: list[int]) -> list[Player]:
        if not ids:
            return []

        statement = (
            select(Player)
            .options(selectinload(Player.team_memberships))
            .where(Player.id.in_(ids))
        )

        return list(self.db.scalars(statement).all())