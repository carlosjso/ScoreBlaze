from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.orm import Match, MatchEvent, Player, Team
from modules.match_events.domain import MatchEventStatus


class MatchEventRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, match_event: MatchEvent) -> MatchEvent:
        self.db.add(match_event)
        return match_event

    def delete(self, match_event: MatchEvent) -> None:
        self.db.delete(match_event)

    def update(self, match_event: MatchEvent, **fields) -> MatchEvent:
        for key, value in fields.items():
            setattr(match_event, key, value)
        self.db.flush()
        return match_event

    def mark_voided(self, match_event: MatchEvent) -> MatchEvent:
        return self.update(match_event, status=MatchEventStatus.VOIDED.value)

    def get(self, event_id: int) -> Optional[MatchEvent]:
        statement = (
            select(MatchEvent)
            .options(
                selectinload(MatchEvent.match),
                selectinload(MatchEvent.team),
                selectinload(MatchEvent.player),
            )
            .where(MatchEvent.id == event_id)
        )
        return self.db.scalar(statement)

    def list(self) -> list[MatchEvent]:
        statement = (
            select(MatchEvent)
            .options(
                selectinload(MatchEvent.match),
                selectinload(MatchEvent.team),
                selectinload(MatchEvent.player),
            )
            .order_by(MatchEvent.match_id.asc(), MatchEvent.event_order.asc(), MatchEvent.id.asc())
        )
        return list(self.db.scalars(statement).all())

    def list_by_match(self, match_id: int) -> list[MatchEvent]:
        statement = (
            select(MatchEvent)
            .options(
                selectinload(MatchEvent.match),
                selectinload(MatchEvent.team),
                selectinload(MatchEvent.player),
            )
            .where(MatchEvent.match_id == match_id)
            .order_by(MatchEvent.event_order.asc(), MatchEvent.id.asc())
        )
        return list(self.db.scalars(statement).all())

    def list_by_match_ids(self, match_ids: list[int]) -> list[MatchEvent]:
        if not match_ids:
            return []
        statement = (
            select(MatchEvent)
            .options(
                selectinload(MatchEvent.match),
                selectinload(MatchEvent.team),
                selectinload(MatchEvent.player),
            )
            .where(MatchEvent.match_id.in_(match_ids))
            .order_by(MatchEvent.match_id.asc(), MatchEvent.event_order.asc(), MatchEvent.id.asc())
        )
        return list(self.db.scalars(statement).all())

    def list_by_player(self, player_id: int) -> list[MatchEvent]:
        statement = (
            select(MatchEvent)
            .options(
                selectinload(MatchEvent.match),
                selectinload(MatchEvent.team),
                selectinload(MatchEvent.player),
            )
            .where(MatchEvent.player_id == player_id)
            .order_by(MatchEvent.match_id.asc(), MatchEvent.event_order.asc(), MatchEvent.id.asc())
        )
        return list(self.db.scalars(statement).all())

    def get_existing_match_ids(self, match_ids: list[int]) -> set[int]:
        if not match_ids:
            return set()
        statement = select(Match.id).where(Match.id.in_(match_ids))
        return set(self.db.scalars(statement).all())

    def get_existing_team_ids(self, team_ids: list[int]) -> set[int]:
        if not team_ids:
            return set()
        statement = select(Team.id).where(Team.id.in_(team_ids))
        return set(self.db.scalars(statement).all())

    def get_existing_player_ids(self, player_ids: list[int]) -> set[int]:
        if not player_ids:
            return set()
        statement = select(Player.id).where(Player.id.in_(player_ids))
        return set(self.db.scalars(statement).all())
