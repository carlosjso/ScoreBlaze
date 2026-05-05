from __future__ import annotations

from typing import TYPE_CHECKING

from modules.memberships.repositories import MembershipRepository
from modules.match_events.domain import MatchEventType
from modules.players.repositories import PlayerRepository

from .actor_resolver import ScoreboardActorResolver
from .domain import ScoreboardTeamKey
from .schemas import (
    ScoreboardEventOut,
    ScoreboardRosterPlayerOut,
    ScoreboardSnapshotOut,
    ScoreboardTeamSnapshotOut,
)

if TYPE_CHECKING:
    from data.orm import MatchEvent


class ScoreboardSnapshotBuilder:
    def __init__(
        self,
        actor_resolver: ScoreboardActorResolver,
        membership_repo: MembershipRepository,
        player_repo: PlayerRepository,
    ):
        self.actor_resolver = actor_resolver
        self.membership_repo = membership_repo
        self.player_repo = player_repo

    def build(self, match, active_events: list[MatchEvent]) -> ScoreboardSnapshotOut:
        team_a = self.actor_resolver.resolve_team(match, ScoreboardTeamKey.TEAM_A)
        team_b = self.actor_resolver.resolve_team(match, ScoreboardTeamKey.TEAM_B)

        return ScoreboardSnapshotOut(
            match=match,
            team_a=ScoreboardTeamSnapshotOut(
                id=team_a.id,
                key=ScoreboardTeamKey.TEAM_A,
                name=team_a.name,
                logo_base64=team_a.logo_base64,
                score=match.score_team_a or 0,
                fouls=self._count_team_fouls(team_a.id, active_events),
                players=self._build_roster(team_a.id),
            ),
            team_b=ScoreboardTeamSnapshotOut(
                id=team_b.id,
                key=ScoreboardTeamKey.TEAM_B,
                name=team_b.name,
                logo_base64=team_b.logo_base64,
                score=match.score_team_b or 0,
                fouls=self._count_team_fouls(team_b.id, active_events),
                players=self._build_roster(team_b.id),
            ),
            events=[self._to_event_out(match, event) for event in active_events],
        )

    def _build_roster(self, team_id: int) -> list[ScoreboardRosterPlayerOut]:
        memberships = self.membership_repo.list_by_team(team_id)
        player_ids = [membership.player_id for membership in memberships]
        players_by_id = {player.id: player for player in self.player_repo.get_many_by_ids(player_ids)}

        def sort_key(relation) -> tuple[int, str, str]:
            shirt_number = relation.shirt_number or ""
            numeric_order = int(shirt_number) if shirt_number.isdigit() else 9999
            player_name = players_by_id.get(relation.player_id).name if relation.player_id in players_by_id else ""
            return numeric_order, shirt_number, player_name.lower()

        roster: list[ScoreboardRosterPlayerOut] = []
        for membership in sorted(memberships, key=sort_key):
            player = players_by_id.get(membership.player_id)
            if not player:
                continue

            shirt_number = membership.shirt_number.strip() if membership.shirt_number else None
            label = f"#{shirt_number} {player.name}" if shirt_number else player.name
            roster.append(
                ScoreboardRosterPlayerOut(
                    id=player.id,
                    name=player.name,
                    shirt_number=shirt_number,
                    label=label,
                )
            )

        return roster

    @staticmethod
    def _count_team_fouls(team_id: int, active_events: list[MatchEvent]) -> int:
        return sum(
            1
            for event in active_events
            if event.team_id == team_id and event.event_type == MatchEventType.FOUL
        )

    @staticmethod
    def _to_event_out(match, event: MatchEvent) -> ScoreboardEventOut:
        team_key = ScoreboardTeamKey.TEAM_A if event.team_id == match.team_a_id else ScoreboardTeamKey.TEAM_B
        return ScoreboardEventOut(
            id=event.id,
            team_key=team_key,
            team_id=event.team_id,
            player_id=event.player_id,
            guest_name=event.guest_name,
            event_type=event.event_type,
            period=event.period,
            elapsed_seconds=event.elapsed_seconds,
            event_order=event.event_order,
            status=event.status,
            created_at=event.created_at,
        )
