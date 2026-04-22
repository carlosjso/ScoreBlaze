from data.entities import TeamStat
from data.models import TeamStatCreate, TeamStatUpdate
from repositories import TeamStatRepository


class TeamStatService:
    def __init__(self, team_stat_repo: TeamStatRepository):
        self.team_stat_repo = team_stat_repo

    @property
    def db(self):
        return self.team_stat_repo.db

    def _validate_team_exists(self, team_id: int) -> None:
        if team_id not in self.team_stat_repo.get_existing_team_ids([team_id]):
            raise LookupError("Team not found")

    def create(self, data: TeamStatCreate) -> TeamStat:
        self._validate_team_exists(data.team_id)
        if self.team_stat_repo.get(data.team_id):
            raise ValueError("Stats for this team already exist")

        team_stat = TeamStat(**data.model_dump())
        self.team_stat_repo.add(team_stat)
        self.db.commit()
        self.db.refresh(team_stat)
        return team_stat

    def list(self) -> list[TeamStat]:
        return self.team_stat_repo.list()

    def get(self, team_id: int) -> TeamStat | None:
        return self.team_stat_repo.get(team_id)

    def update(self, team_id: int, data: TeamStatUpdate) -> TeamStat:
        team_stat = self.team_stat_repo.get(team_id)
        if not team_stat:
            raise LookupError("Team stats not found")

        changes = data.model_dump(exclude_unset=True)
        for key, value in changes.items():
            setattr(team_stat, key, value)

        self.db.commit()
        self.db.refresh(team_stat)
        return team_stat

    def delete(self, team_id: int) -> None:
        team_stat = self.team_stat_repo.get(team_id)
        if not team_stat:
            raise LookupError("Team stats not found")
        self.team_stat_repo.delete(team_stat)
        self.db.commit()
