from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.entities import Match, MatchEvent, Player, Team


class MatchEventRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: MatchEvent) -> MatchEvent:
        self.db.add(entity)
        return entity

    def delete(self, entity: MatchEvent) -> None:
        self.db.delete(entity)

    def get(self, event_id: int) -> Optional[MatchEvent]:
        stmt = (
            select(MatchEvent)
            .options(
                selectinload(MatchEvent.match),
                selectinload(MatchEvent.team),
                selectinload(MatchEvent.player),
            )
            .where(MatchEvent.id == event_id)
        )
        return self.db.scalar(stmt)

    def list(self) -> list[MatchEvent]:
        stmt = (
            select(MatchEvent)
            .options(
                selectinload(MatchEvent.match),
                selectinload(MatchEvent.team),
                selectinload(MatchEvent.player),
            )
            .order_by(MatchEvent.match_id.asc(), MatchEvent.event_order.asc(), MatchEvent.id.asc())
        )
        return list(self.db.scalars(stmt).all())

    def list_by_match(self, match_id: int) -> list[MatchEvent]:
        stmt = (
            select(MatchEvent)
            .options(
                selectinload(MatchEvent.match),
                selectinload(MatchEvent.team),
                selectinload(MatchEvent.player),
            )
            .where(MatchEvent.match_id == match_id)
            .order_by(MatchEvent.event_order.asc(), MatchEvent.id.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_existing_match_ids(self, match_ids: list[int]) -> set[int]:
        if not match_ids:
            return set()
        stmt = select(Match.id).where(Match.id.in_(match_ids))
        return set(self.db.scalars(stmt).all())

    def get_existing_team_ids(self, team_ids: list[int]) -> set[int]:
        if not team_ids:
            return set()
        stmt = select(Team.id).where(Team.id.in_(team_ids))
        return set(self.db.scalars(stmt).all())

    def get_existing_player_ids(self, player_ids: list[int]) -> set[int]:
        if not player_ids:
            return set()
        stmt = select(Player.id).where(Player.id.in_(player_ids))
        return set(self.db.scalars(stmt).all())
