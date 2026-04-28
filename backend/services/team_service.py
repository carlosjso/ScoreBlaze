import base64

from data.entities import Team
from data.models import TeamCreate, TeamUpdate
from repositories import MembershipRepository, PlayerRepository, TeamRepository


class TeamService:
    def __init__(
        self,
        team_repo: TeamRepository,
        player_repo: PlayerRepository,
        membership_repo: MembershipRepository,
    ):
        self.team_repo = team_repo
        self.player_repo = player_repo
        self.membership_repo = membership_repo

    @property
    def db(self):
        return self.team_repo.db

    @staticmethod
    def _decode_logo(logo_base64: str | None) -> bytes | None:
        if not logo_base64:
            return None
        payload = logo_base64.strip()
        if payload.startswith("data:") and "," in payload:
            payload = payload.split(",", 1)[1]
        try:
            return base64.b64decode(payload, validate=True)
        except Exception as exc:  # pragma: no cover
            raise ValueError("Invalid logo. Could not decode Base64") from exc

    def _validate_player_ids(self, player_ids: list[int]) -> list[int]:
        unique_ids = sorted(set(player_ids))
        if not unique_ids:
            return []

        found = self.player_repo.get_many_by_ids(unique_ids)
        found_ids = {player.id for player in found}
        missing_ids = [player_id for player_id in unique_ids if player_id not in found_ids]
        if missing_ids:
            raise LookupError(f"Players not found: {missing_ids}")
        return unique_ids

    def create(self, data: TeamCreate) -> Team:
        if self.team_repo.get_by_name(data.name):
            raise ValueError("Team name already exists")

        validated_player_ids = self._validate_player_ids(data.player_ids)
        team = Team(
            name=data.name,
            responsible_name=data.responsible_name,
            responsible_phone=data.responsible_phone,
            responsible_email=data.responsible_email,
            logo=self._decode_logo(data.logo_base64),
        )
        self.team_repo.add(team)
        self.db.flush()

        if validated_player_ids:
            self.membership_repo.replace_player_ids_for_team(team.id, validated_player_ids)

        self.db.commit()
        self.db.refresh(team)
        return team

    def list(self) -> list[Team]:
        return self.team_repo.list()

    def get(self, team_id: int) -> Team | None:
        return self.team_repo.get(team_id)

    def update(self, team_id: int, data: TeamUpdate) -> Team:
        team = self.team_repo.get(team_id)
        if not team:
            raise LookupError("Team not found")

        changes = data.model_dump(exclude_unset=True)
        if "name" in changes:
            existing = self.team_repo.get_by_name(changes["name"])
            if existing and existing.id != team_id:
                raise ValueError("Team name already exists")

        player_ids = changes.pop("player_ids", None)
        if player_ids is not None:
            validated_player_ids = self._validate_player_ids(player_ids)
            self.membership_repo.replace_player_ids_for_team(team_id, validated_player_ids)

        if "logo_base64" in changes:
            team.logo = self._decode_logo(changes.pop("logo_base64"))

        for key, value in changes.items():
            setattr(team, key, value)

        self.db.commit()
        self.db.refresh(team)
        return team

    def delete(self, team_id: int) -> None:
        team = self.team_repo.get(team_id)
        if not team:
            raise LookupError("Team not found")
        self.team_repo.delete(team)
        self.db.commit()
