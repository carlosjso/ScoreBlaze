from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.entities import Player, PlayerStat


class PlayerStatRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: PlayerStat) -> PlayerStat:
        self.db.add(entity)
        return entity

    def delete(self, entity: PlayerStat) -> None:
        self.db.delete(entity)

    def get(self, player_id: int) -> Optional[PlayerStat]:
        stmt = select(PlayerStat).where(PlayerStat.player_id == player_id)
        return self.db.scalar(stmt)

    def list(self) -> list[PlayerStat]:
        stmt = select(PlayerStat).order_by(PlayerStat.player_id.asc())
        return list(self.db.scalars(stmt).all())

    def get_existing_player_ids(self, player_ids: list[int]) -> set[int]:
        if not player_ids:
            return set()
        stmt = select(Player.id).where(Player.id.in_(player_ids))
        return set(self.db.scalars(stmt).all())
