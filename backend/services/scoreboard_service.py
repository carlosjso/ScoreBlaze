from __future__ import annotations

from typing import Optional

from data.entities import MatchEvent, PlayerStat, TeamStat
from data.models import (
    ScoreboardEventCreate,
    ScoreboardEventOut,
    ScoreboardRosterPlayerOut,
    ScoreboardSnapshotOut,
    ScoreboardTeamSnapshotOut,
)
from repositories import (
    MatchEventRepository,
    MatchRepository,
    MembershipRepository,
    PlayerRepository,
    PlayerStatRepository,
    TeamRepository,
    TeamStatRepository,
)


class ScoreboardService:
    POINTS_BY_EVENT = {
        "point_1": 1,
        "point_2": 2,
        "point_3": 3,
    }

    def __init__(
        self,
        match_repo: MatchRepository,
        match_event_repo: MatchEventRepository,
        team_repo: TeamRepository,
        player_repo: PlayerRepository,
        team_stat_repo: TeamStatRepository,
        player_stat_repo: PlayerStatRepository,
        membership_repo: MembershipRepository,
    ):
        self.match_repo = match_repo
        self.match_event_repo = match_event_repo
        self.team_repo = team_repo
        self.player_repo = player_repo
        self.team_stat_repo = team_stat_repo
        self.player_stat_repo = player_stat_repo
        self.membership_repo = membership_repo

    @property
    def db(self):
        return self.match_repo.db

    def get_snapshot(self, match_id: int) -> ScoreboardSnapshotOut:
        match = self._get_match_or_raise(match_id)
        active_events = self._list_active_events(match_id)
        return self._build_snapshot(match, active_events)

    def record_event(self, match_id: int, data: ScoreboardEventCreate) -> ScoreboardSnapshotOut:
        match = self._get_match_or_raise(match_id)
        team = self._resolve_team(match, data.team_key)
        player_id, guest_name = self._resolve_actor(team.id, data.player_id, data.guest_name)

        event = MatchEvent(
            match_id=match.id,
            team_id=team.id,
            player_id=player_id,
            guest_name=guest_name,
            event_type=data.event_type,
            period=data.period,
            elapsed_seconds=data.elapsed_seconds,
            event_order=self._get_next_event_order(match.id),
            status="active",
        )
        self.match_event_repo.add(event)
        self.db.flush()

        self._apply_event_side_effects(event, direction=1)

        active_events = self._list_active_events(match.id)
        match.status = "live"
        self._sync_match_scores(match, active_events)

        self.db.commit()
        return self.get_snapshot(match.id)

    def undo_last_event(self, match_id: int) -> ScoreboardSnapshotOut:
        match = self._get_match_or_raise(match_id)
        active_events = self._list_active_events(match.id)

        if not active_events:
            raise ValueError("No hay eventos activos para deshacer.")

        last_event = active_events[-1]
        last_event.status = "voided"
        self._apply_event_side_effects(last_event, direction=-1)

        remaining_active_events = active_events[:-1]
        match.status = "live" if remaining_active_events else "scheduled"
        self._sync_match_scores(match, remaining_active_events)

        self.db.commit()
        return self.get_snapshot(match.id)

    def reset(self, match_id: int) -> ScoreboardSnapshotOut:
        match = self._get_match_or_raise(match_id)
        active_events = self._list_active_events(match.id)

        for event in reversed(active_events):
            event.status = "voided"
            self._apply_event_side_effects(event, direction=-1)

        match.status = "scheduled"
        self._sync_match_scores(match, [])

        self.db.commit()
        return self.get_snapshot(match.id)

    def _get_match_or_raise(self, match_id: int):
        match = self.match_repo.get(match_id)
        if not match:
            raise LookupError("Match not found")
        return match

    def _resolve_team(self, match, team_key: str):
        team_id = match.team_a_id if team_key == "A" else match.team_b_id
        team = self.team_repo.get(team_id)
        if not team:
            raise LookupError("Team not found")
        return team

    @staticmethod
    def _normalize_guest_name(guest_name: str | None) -> str | None:
        if guest_name is None:
            return None
        normalized = guest_name.strip()
        return normalized or None

    def _resolve_actor(self, team_id: int, player_id: int | None, guest_name: str | None) -> tuple[int | None, str | None]:
        normalized_guest_name = self._normalize_guest_name(guest_name)
        has_player = player_id is not None
        has_guest = normalized_guest_name is not None

        if has_player == has_guest:
            raise ValueError("Debes enviar exactamente un actor: player_id o guest_name.")

        if has_player:
            player = self.player_repo.get(player_id)
            if not player:
                raise LookupError("Player not found")
            if not self.membership_repo.get(player_id, team_id):
                raise ValueError("El jugador no pertenece al equipo seleccionado.")
            return player_id, None

        return None, normalized_guest_name

    def _get_next_event_order(self, match_id: int) -> int:
        events = self.match_event_repo.list_by_match(match_id)
        if not events:
            return 1
        return events[-1].event_order + 1

    def _list_active_events(self, match_id: int) -> list[MatchEvent]:
        return [
            event
            for event in self.match_event_repo.list_by_match(match_id)
            if event.status == "active"
        ]

    def _get_or_create_team_stat(self, team_id: int) -> TeamStat:
        team_stat = self.team_stat_repo.get(team_id)
        if team_stat:
            return team_stat

        team_stat = TeamStat(team_id=team_id)
        self.team_stat_repo.add(team_stat)
        self.db.flush()
        return team_stat

    def _get_or_create_player_stat(self, player_id: int) -> PlayerStat:
        player_stat = self.player_stat_repo.get(player_id)
        if player_stat:
            return player_stat

        player_stat = PlayerStat(player_id=player_id)
        self.player_stat_repo.add(player_stat)
        self.db.flush()
        return player_stat

    @staticmethod
    def _increment_non_negative(current: int, delta: int) -> int:
        return max(0, current + delta)

    def _apply_event_side_effects(self, event: MatchEvent, direction: int) -> None:
        points = self.POINTS_BY_EVENT.get(event.event_type, 0)

        if points:
            scoring_team_stat = self._get_or_create_team_stat(event.team_id)
            scoring_team_stat.points_for = self._increment_non_negative(
                scoring_team_stat.points_for,
                points * direction,
            )
            scoring_team_stat.points_difference = scoring_team_stat.points_for - scoring_team_stat.points_against

        match = self._get_match_or_raise(event.match_id)
        opponent_team_id = match.team_b_id if event.team_id == match.team_a_id else match.team_a_id

        if points:
            opponent_team_stat = self._get_or_create_team_stat(opponent_team_id)
            opponent_team_stat.points_against = self._increment_non_negative(
                opponent_team_stat.points_against,
                points * direction,
            )
            opponent_team_stat.points_difference = opponent_team_stat.points_for - opponent_team_stat.points_against

        if event.event_type == "foul":
            team_stat = self._get_or_create_team_stat(event.team_id)
            team_stat.total_team_fouls = self._increment_non_negative(
                team_stat.total_team_fouls,
                direction,
            )

        if event.player_id is None:
            return

        player_stat = self._get_or_create_player_stat(event.player_id)

        if points:
            player_stat.total_points = self._increment_non_negative(
                player_stat.total_points,
                points * direction,
            )
            if event.event_type == "point_1":
                player_stat.made_1pt = self._increment_non_negative(player_stat.made_1pt, direction)
            elif event.event_type == "point_2":
                player_stat.made_2pt = self._increment_non_negative(player_stat.made_2pt, direction)
            elif event.event_type == "point_3":
                player_stat.made_3pt = self._increment_non_negative(player_stat.made_3pt, direction)
            return

        if event.event_type == "miss":
            player_stat.missed_shots = self._increment_non_negative(player_stat.missed_shots, direction)
        elif event.event_type == "assist":
            player_stat.total_assists = self._increment_non_negative(player_stat.total_assists, direction)
        elif event.event_type == "rebound":
            player_stat.total_rebounds = self._increment_non_negative(player_stat.total_rebounds, direction)
        elif event.event_type == "foul":
            player_stat.total_fouls = self._increment_non_negative(player_stat.total_fouls, direction)

    def _sync_match_scores(self, match, active_events: list[MatchEvent]) -> None:
        score_a = 0
        score_b = 0
        has_points = False

        for event in active_events:
            points = self.POINTS_BY_EVENT.get(event.event_type, 0)
            if not points:
                continue

            has_points = True
            if event.team_id == match.team_a_id:
                score_a += points
            elif event.team_id == match.team_b_id:
                score_b += points

        if has_points:
            match.score_team_a = score_a
            match.score_team_b = score_b
            if score_a == score_b:
                match.winner_team_id = None
                match.is_draw = False
            else:
                match.winner_team_id = match.team_a_id if score_a > score_b else match.team_b_id
                match.is_draw = False
            return

        match.score_team_a = None
        match.score_team_b = None
        match.winner_team_id = None
        match.is_draw = False

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
            if event.team_id == team_id and event.event_type == "foul"
        )

    def _to_event_out(self, match, event: MatchEvent) -> ScoreboardEventOut:
        team_key = "A" if event.team_id == match.team_a_id else "B"
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

    def _build_snapshot(self, match, active_events: list[MatchEvent]) -> ScoreboardSnapshotOut:
        team_a = self._resolve_team(match, "A")
        team_b = self._resolve_team(match, "B")

        return ScoreboardSnapshotOut(
            match=match,
            team_a=ScoreboardTeamSnapshotOut(
                id=team_a.id,
                key="A",
                name=team_a.name,
                logo_base64=team_a.logo_base64,
                score=match.score_team_a or 0,
                fouls=self._count_team_fouls(team_a.id, active_events),
                players=self._build_roster(team_a.id),
            ),
            team_b=ScoreboardTeamSnapshotOut(
                id=team_b.id,
                key="B",
                name=team_b.name,
                logo_base64=team_b.logo_base64,
                score=match.score_team_b or 0,
                fouls=self._count_team_fouls(team_b.id, active_events),
                players=self._build_roster(team_b.id),
            ),
            events=[self._to_event_out(match, event) for event in active_events],
        )
