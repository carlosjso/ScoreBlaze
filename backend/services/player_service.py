import base64

from data.entities import Player
from data.models import PlayerCreate, PlayerUpdate
from repositories import MembershipRepository, PlayerRepository, TeamRepository


class PlayerService:
    def __init__(
        self,
        player_repo: PlayerRepository,
        team_repo: TeamRepository,
        membership_repo: MembershipRepository,
    ):
        self.player_repo = player_repo
        self.team_repo = team_repo
        self.membership_repo = membership_repo

    @property
    def db(self):
        return self.player_repo.db

    @staticmethod
    def _decode_photo(photo_base64: str | None) -> bytes | None:
        if not photo_base64:
            return None
        payload = photo_base64.strip()
        if payload.startswith("data:") and "," in payload:
            payload = payload.split(",", 1)[1]
        try:
            return base64.b64decode(payload, validate=True)
        except Exception as exc:  # pragma: no cover
            raise ValueError("Invalid photo. Could not decode Base64") from exc

    def _validate_team_ids(self, team_ids: list[int]) -> list[int]:
        unique_ids = sorted(set(team_ids))
        if not unique_ids:
            return []

        found = self.team_repo.get_many_by_ids(unique_ids)
        found_ids = {team.id for team in found}
        missing_ids = [team_id for team_id in unique_ids if team_id not in found_ids]
        if missing_ids:
            raise LookupError(f"Teams not found: {missing_ids}")
        return unique_ids

    def create(self, data: PlayerCreate) -> Player:
        if self.player_repo.get_by_email(data.email):
            raise ValueError("Email already exists")

        validated_team_ids = self._validate_team_ids(data.team_ids)
        player = Player(name=data.name, email=data.email, phone=data.phone, photo=self._decode_photo(data.photo_base64))
        self.player_repo.add(player)
        self.db.flush()

        if validated_team_ids:
            self.membership_repo.replace_team_ids_for_player(player.id, validated_team_ids)

        self.db.commit()
        self.db.refresh(player)
        return player

    def list(self) -> list[Player]:
        return self.player_repo.list()

    def get(self, player_id: int) -> Player | None:
        return self.player_repo.get(player_id)

    def update(self, player_id: int, data: PlayerUpdate) -> Player:
        player = self.player_repo.get(player_id)
        if not player:
            raise LookupError("Player not found")

        changes = data.model_dump(exclude_unset=True)
        if "email" in changes:
            existing = self.player_repo.get_by_email(changes["email"])
            if existing and existing.id != player_id:
                raise ValueError("Email already exists")

        team_ids = changes.pop("team_ids", None)
        if team_ids is not None:
            validated_team_ids = self._validate_team_ids(team_ids)
            self.membership_repo.replace_team_ids_for_player(player_id, validated_team_ids)

        if "photo_base64" in changes:
            player.photo = self._decode_photo(changes.pop("photo_base64"))

        for key, value in changes.items():
            setattr(player, key, value)

        self.db.commit()
        self.db.refresh(player)
        return player

    def delete(self, player_id: int) -> None:
        player = self.player_repo.get(player_id)
        if not player:
            raise LookupError("Player not found")
        self.player_repo.delete(player)
        self.db.commit()
