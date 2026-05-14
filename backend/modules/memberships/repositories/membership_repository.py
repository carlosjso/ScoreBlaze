from __future__ import annotations

from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from data.orm import TeamMembership


class MembershipRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, team_membership: TeamMembership) -> TeamMembership:
        self.db.add(team_membership)
        return team_membership

    def delete(self, team_membership: TeamMembership) -> None:
        self.db.delete(team_membership)

    def update(self, team_membership: TeamMembership, **fields) -> TeamMembership:
        for key, value in fields.items():
            setattr(team_membership, key, value)
        self.db.flush()
        return team_membership

    def get(self, player_id: int, team_id: int) -> Optional[TeamMembership]:
        statement = select(TeamMembership).where(
            TeamMembership.player_id == player_id,
            TeamMembership.team_id == team_id,
        )
        return self.db.scalar(statement)

    # NUEVO
    def get_by_player_and_team(
        self,
        player_id: int,
        team_id: int,
    ) -> Optional[TeamMembership]:
        statement = select(TeamMembership).where(
            TeamMembership.player_id == player_id,
            TeamMembership.team_id == team_id,
        )
        return self.db.scalar(statement)

    def list(self) -> list[TeamMembership]:
        statement = select(TeamMembership).order_by(
            TeamMembership.player_id.asc(),
            TeamMembership.team_id.asc(),
        )
        return list(self.db.scalars(statement).all())

    def list_by_team(self, team_id: int) -> list[TeamMembership]:
        statement = (
            select(TeamMembership)
            .where(TeamMembership.team_id == team_id)
            .order_by(TeamMembership.player_id.asc())
        )
        return list(self.db.scalars(statement).all())

    def list_by_player(self, player_id: int) -> list[TeamMembership]:
        statement = (
            select(TeamMembership)
            .where(TeamMembership.player_id == player_id)
            .order_by(TeamMembership.team_id.asc())
        )
        return list(self.db.scalars(statement).all())

    def replace_team_ids_for_player(self, player_id: int, team_ids: list[int]) -> None:
        unique_team_ids = set(team_ids)
        current_links = self.list_by_player(player_id)
        current_team_ids = {link.team_id for link in current_links}

        to_remove = current_team_ids - unique_team_ids
        to_add = unique_team_ids - current_team_ids

        if to_remove:
            statement = delete(TeamMembership).where(
                TeamMembership.player_id == player_id,
                TeamMembership.team_id.in_(to_remove),
            )
            self.db.execute(statement)

        for team_id in to_add:
            self.db.add(TeamMembership(player_id=player_id, team_id=team_id))

    def replace_player_ids_for_team(self, team_id: int, player_ids: list[int]) -> None:
        unique_player_ids = set(player_ids)
        current_links = self.list_by_team(team_id)
        current_player_ids = {link.player_id for link in current_links}

        to_remove = current_player_ids - unique_player_ids
        to_add = unique_player_ids - current_player_ids

        if to_remove:
            statement = delete(TeamMembership).where(
                TeamMembership.team_id == team_id,
                TeamMembership.player_id.in_(to_remove),
            )
            self.db.execute(statement)

        for player_id in to_add:
            self.db.add(TeamMembership(player_id=player_id, team_id=team_id))