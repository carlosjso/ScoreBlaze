from data.entities import PlayerStat
from data.models import PlayerStatCreate, PlayerStatUpdate
from repositories import PlayerStatRepository


class PlayerStatService:
    def __init__(self, player_stat_repo: PlayerStatRepository):
        self.player_stat_repo = player_stat_repo

    @property
    def db(self):
        return self.player_stat_repo.db

    def _validate_player_exists(self, player_id: int) -> None:
        if player_id not in self.player_stat_repo.get_existing_player_ids([player_id]):
            raise LookupError("Player not found")

    def create(self, data: PlayerStatCreate) -> PlayerStat:
        self._validate_player_exists(data.player_id)
        if self.player_stat_repo.get(data.player_id):
            raise ValueError("Stats for this player already exist")

        player_stat = PlayerStat(**data.model_dump())
        self.player_stat_repo.add(player_stat)
        self.db.commit()
        self.db.refresh(player_stat)
        return player_stat

    def list(self) -> list[PlayerStat]:
        return self.player_stat_repo.list()

    def get(self, player_id: int) -> PlayerStat | None:
        return self.player_stat_repo.get(player_id)

    def update(self, player_id: int, data: PlayerStatUpdate) -> PlayerStat:
        player_stat = self.player_stat_repo.get(player_id)
        if not player_stat:
            raise LookupError("Player stats not found")

        changes = data.model_dump(exclude_unset=True)
        for key, value in changes.items():
            setattr(player_stat, key, value)

        self.db.commit()
        self.db.refresh(player_stat)
        return player_stat

    def delete(self, player_id: int) -> None:
        player_stat = self.player_stat_repo.get(player_id)
        if not player_stat:
            raise LookupError("Player stats not found")
        self.player_stat_repo.delete(player_stat)
        self.db.commit()
