from data.orm import PlayerStat
from database.unit_of_work import UnitOfWork
from modules.statistics.repositories import PlayerStatRepository

from .policy import PlayerStatPolicy
from .schemas import PlayerStatCreate, PlayerStatUpdate


class PlayerStatService:
    def __init__(
        self,
        player_stat_repo: PlayerStatRepository,
        unit_of_work: UnitOfWork,
        policy: PlayerStatPolicy,
    ):
        self.player_stat_repo = player_stat_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    def create(self, data: PlayerStatCreate) -> PlayerStat:
        self.policy.ensure_player_exists(data.player_id)
        self.policy.ensure_player_stat_does_not_exist(data.player_id)

        player_stat = PlayerStat(**data.model_dump())
        with self.unit_of_work.transaction():
            self.player_stat_repo.add(player_stat)
        self.unit_of_work.refresh(player_stat)
        return player_stat

    def list(self) -> list[PlayerStat]:
        return self.player_stat_repo.list()

    def get(self, player_id: int) -> PlayerStat:
        return self.policy.get_existing_player_stat(player_id)

    def update(self, player_id: int, data: PlayerStatUpdate) -> PlayerStat:
        player_stat = self.policy.get_existing_player_stat(player_id)

        with self.unit_of_work.transaction():
            self.player_stat_repo.update(
                player_stat,
                matches_played=data.matches_played,
                total_points=data.total_points,
                made_1pt=data.made_1pt,
                made_2pt=data.made_2pt,
                made_3pt=data.made_3pt,
                missed_shots=data.missed_shots,
                total_assists=data.total_assists,
                total_rebounds=data.total_rebounds,
                total_fouls=data.total_fouls,
            )
        self.unit_of_work.refresh(player_stat)
        return player_stat

    def delete(self, player_id: int) -> None:
        player_stat = self.policy.get_existing_player_stat(player_id)
        with self.unit_of_work.transaction():
            self.player_stat_repo.delete(player_stat)
