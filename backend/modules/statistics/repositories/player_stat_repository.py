from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.orm import Player, PlayerStat


class PlayerStatRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, player_stat: PlayerStat) -> PlayerStat:
        self.db.add(player_stat)
        return player_stat

    def delete(self, player_stat: PlayerStat) -> None:
        self.db.delete(player_stat)

    def update(self, player_stat: PlayerStat, **fields) -> PlayerStat:
        for key, value in fields.items():
            setattr(player_stat, key, value)
        self.db.flush()
        return player_stat

    def get(self, player_id: int) -> Optional[PlayerStat]:
        statement = select(PlayerStat).where(PlayerStat.player_id == player_id)
        return self.db.scalar(statement)

    def list(self) -> list[PlayerStat]:
        statement = select(PlayerStat).order_by(PlayerStat.player_id.asc())
        return list(self.db.scalars(statement).all())

    def get_existing_player_ids(self, player_ids: list[int]) -> set[int]:
        if not player_ids:
            return set()
        statement = select(Player.id).where(Player.id.in_(player_ids))
        return set(self.db.scalars(statement).all())
