from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from data.orm import LeagueTeamMembership


class LeagueMembershipRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_by_league(self, league_id: int) -> list[LeagueTeamMembership]:
        statement = (
            select(LeagueTeamMembership)
            .where(LeagueTeamMembership.league_id == league_id)
            .order_by(LeagueTeamMembership.sort_order.asc(), LeagueTeamMembership.team_id.asc())
        )
        return list(self.db.scalars(statement).all())

    def replace_team_ids_for_league(self, league_id: int, team_ids: list[int]) -> None:
        self.db.execute(delete(LeagueTeamMembership).where(LeagueTeamMembership.league_id == league_id))
        for index, team_id in enumerate(team_ids, start=1):
            self.db.add(LeagueTeamMembership(league_id=league_id, team_id=team_id, sort_order=index))
