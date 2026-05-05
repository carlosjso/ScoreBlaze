from __future__ import annotations

from data.orm import TeamMembership
from database.unit_of_work import UnitOfWork
from modules.memberships.repositories import MembershipRepository

from .policy import TeamMembershipPolicy
from .schemas import TeamMembershipCreate, TeamMembershipUpdate


class TeamMembershipService:
    def __init__(
        self,
        membership_repo: MembershipRepository,
        unit_of_work: UnitOfWork,
        policy: TeamMembershipPolicy,
    ):
        self.membership_repo = membership_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    def create(self, data: TeamMembershipCreate) -> TeamMembership:
        self.policy.ensure_player_and_team_exist(data.player_id, data.team_id)
        self.policy.ensure_new_membership(data.player_id, data.team_id)

        relation = TeamMembership(
            player_id=data.player_id,
            team_id=data.team_id,
            shirt_number=data.shirt_number,
        )
        with self.unit_of_work.transaction():
            self.membership_repo.add(relation)
        self.unit_of_work.refresh(relation)
        return relation

    def list(self) -> list[TeamMembership]:
        return self.membership_repo.list()

    def get(self, player_id: int, team_id: int) -> TeamMembership:
        return self.policy.get_existing_membership(player_id, team_id)

    def update(
        self,
        player_id: int,
        team_id: int,
        data: TeamMembershipUpdate,
    ) -> TeamMembership:
        relation = self.policy.get_existing_membership(player_id, team_id)

        with self.unit_of_work.transaction():
            self.membership_repo.update(relation, shirt_number=data.shirt_number)
        self.unit_of_work.refresh(relation)
        return relation

    def delete(self, player_id: int, team_id: int) -> None:
        relation = self.policy.get_existing_membership(player_id, team_id)
        with self.unit_of_work.transaction():
            self.membership_repo.delete(relation)

    def list_by_team(self, team_id: int) -> list[TeamMembership]:
        self.policy.ensure_team_exists(team_id)
        return self.membership_repo.list_by_team(team_id)

    def list_by_player(self, player_id: int) -> list[TeamMembership]:
        self.policy.ensure_player_exists(player_id)
        return self.membership_repo.list_by_player(player_id)
