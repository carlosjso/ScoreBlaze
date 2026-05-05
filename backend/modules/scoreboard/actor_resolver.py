from __future__ import annotations

from core.exceptions import NotFoundException, ValidationException
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.scoreboard.domain import BasketballScoreboardRules, ScoreboardTeamKey
from modules.teams.repositories import TeamRepository


class ScoreboardActorResolver:
    def __init__(
        self,
        team_repo: TeamRepository,
        player_repo: PlayerRepository,
        membership_repo: MembershipRepository,
        rules: BasketballScoreboardRules,
    ):
        self.team_repo = team_repo
        self.player_repo = player_repo
        self.membership_repo = membership_repo
        self.rules = rules

    def resolve_team(self, match, team_key: ScoreboardTeamKey | str):
        normalized_team_key = ScoreboardTeamKey(team_key)
        team_id = match.team_a_id if normalized_team_key == ScoreboardTeamKey.TEAM_A else match.team_b_id
        team = self.team_repo.get(team_id)
        if not team:
            raise NotFoundException("Team not found")
        return team

    def resolve_actor(
        self,
        team_id: int,
        player_id: int | None,
        guest_name: str | None,
    ) -> tuple[int | None, str | None]:
        resolved_player_id, normalized_guest_name = self.rules.validate_actor(player_id, guest_name)

        if resolved_player_id is None:
            return None, normalized_guest_name

        player = self.player_repo.get(resolved_player_id)
        if not player:
            raise NotFoundException("Player not found")
        if not self.membership_repo.get(resolved_player_id, team_id):
            raise ValidationException("El jugador no pertenece al equipo seleccionado.")
        return resolved_player_id, None
