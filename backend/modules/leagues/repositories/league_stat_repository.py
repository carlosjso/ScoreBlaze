from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.orm import LeagueStat


class LeagueStatRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, league_stat: LeagueStat) -> LeagueStat:
        self.db.add(league_stat)
        return league_stat

    def update(self, league_stat: LeagueStat, **fields) -> LeagueStat:
        for key, value in fields.items():
            setattr(league_stat, key, value)
        self.db.flush()
        return league_stat

    def get(self, league_id: int) -> Optional[LeagueStat]:
        statement = select(LeagueStat).where(LeagueStat.league_id == league_id)
        return self.db.scalar(statement)
