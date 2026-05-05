from data.orm import TeamStat
from database.unit_of_work import UnitOfWork
from modules.statistics.repositories import TeamStatRepository

from .policy import TeamStatPolicy
from .schemas import TeamStatCreate, TeamStatUpdate


class TeamStatService:
    def __init__(
        self,
        team_stat_repo: TeamStatRepository,
        unit_of_work: UnitOfWork,
        policy: TeamStatPolicy,
    ):
        self.team_stat_repo = team_stat_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    def create(self, data: TeamStatCreate) -> TeamStat:
        self.policy.ensure_team_exists(data.team_id)
        self.policy.ensure_team_stat_does_not_exist(data.team_id)

        team_stat = TeamStat(**data.model_dump())
        with self.unit_of_work.transaction():
            self.team_stat_repo.add(team_stat)
        self.unit_of_work.refresh(team_stat)
        return team_stat

    def list(self) -> list[TeamStat]:
        return self.team_stat_repo.list()

    def get(self, team_id: int) -> TeamStat:
        return self.policy.get_existing_team_stat(team_id)

    def update(self, team_id: int, data: TeamStatUpdate) -> TeamStat:
        team_stat = self.policy.get_existing_team_stat(team_id)

        with self.unit_of_work.transaction():
            self.team_stat_repo.update(
                team_stat,
                matches_played=data.matches_played,
                wins=data.wins,
                losses=data.losses,
                draws=data.draws,
                points_for=data.points_for,
                points_against=data.points_against,
                points_difference=data.points_difference,
                standings_points=data.standings_points,
                total_team_fouls=data.total_team_fouls,
            )
        self.unit_of_work.refresh(team_stat)
        return team_stat

    def delete(self, team_id: int) -> None:
        team_stat = self.policy.get_existing_team_stat(team_id)
        with self.unit_of_work.transaction():
            self.team_stat_repo.delete(team_stat)
