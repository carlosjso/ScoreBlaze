from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.orm import League, LeagueTeamMembership, Team, TeamMembership


class LeagueRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, league: League) -> League:
        self.db.add(league)
        return league

    def delete(self, league: League) -> None:
        self.db.delete(league)

    def update(self, league: League, **fields) -> League:
        for key, value in fields.items():
            setattr(league, key, value)
        self.db.flush()
        return league

    def get(self, league_id: int) -> Optional[League]:
        statement = (
            select(League)
            .options(
                selectinload(League.team_memberships)
                .selectinload(LeagueTeamMembership.team)
                .selectinload(Team.team_memberships)
                .selectinload(TeamMembership.player),
                selectinload(League.stat_snapshot),
            )
            .where(League.id == league_id)
        )
        return self.db.scalar(statement)

    def list(self) -> list[League]:
        statement = (
            select(League)
            .options(
                selectinload(League.team_memberships)
                .selectinload(LeagueTeamMembership.team)
                .selectinload(Team.team_memberships)
                .selectinload(TeamMembership.player),
                selectinload(League.stat_snapshot),
            )
            .order_by(League.start_date.desc(), League.id.desc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_name(self, name: str) -> Optional[League]:
        statement = select(League).where(League.name == name)
        return self.db.scalar(statement)
