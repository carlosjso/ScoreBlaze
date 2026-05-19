from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.orm import MatchPlayerParticipation


class MatchPlayerParticipationRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, participation: MatchPlayerParticipation) -> MatchPlayerParticipation:
        self.db.add(participation)
        return participation

    def update(self, participation: MatchPlayerParticipation, **fields) -> MatchPlayerParticipation:
        for key, value in fields.items():
            setattr(participation, key, value)
        self.db.flush()
        return participation

    def get(self, match_id: int, team_id: int, player_id: int) -> Optional[MatchPlayerParticipation]:
        statement = select(MatchPlayerParticipation).where(
            MatchPlayerParticipation.match_id == match_id,
            MatchPlayerParticipation.team_id == team_id,
            MatchPlayerParticipation.player_id == player_id,
        )
        return self.db.scalar(statement)

    def list_by_match(self, match_id: int) -> list[MatchPlayerParticipation]:
        statement = (
            select(MatchPlayerParticipation)
            .where(MatchPlayerParticipation.match_id == match_id)
            .order_by(MatchPlayerParticipation.team_id.asc(), MatchPlayerParticipation.player_id.asc())
        )
        return list(self.db.scalars(statement).all())

    def list_by_match_ids(self, match_ids: list[int]) -> list[MatchPlayerParticipation]:
        if not match_ids:
            return []

        statement = (
            select(MatchPlayerParticipation)
            .where(MatchPlayerParticipation.match_id.in_(match_ids))
            .order_by(
                MatchPlayerParticipation.match_id.asc(),
                MatchPlayerParticipation.team_id.asc(),
                MatchPlayerParticipation.player_id.asc(),
            )
        )
        return list(self.db.scalars(statement).all())

    def list_by_player(self, player_id: int) -> list[MatchPlayerParticipation]:
        statement = (
            select(MatchPlayerParticipation)
            .where(MatchPlayerParticipation.player_id == player_id)
            .order_by(
                MatchPlayerParticipation.match_id.asc(),
                MatchPlayerParticipation.team_id.asc(),
            )
        )
        return list(self.db.scalars(statement).all())
