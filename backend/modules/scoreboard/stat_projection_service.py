from __future__ import annotations

from data.orm import MatchEvent, PlayerStat, TeamStat
from database.unit_of_work import UnitOfWork
from modules.match_events.domain import MatchEventType
from modules.scoreboard.domain import BasketballScoreboardRules
from modules.statistics.repositories import PlayerStatRepository, TeamStatRepository

from .policy import ScoreboardPolicy
from .stat_projection_strategies import applies_team_foul, made_shot_updates, player_event_updates


class ScoreboardStatProjectionService:
    def __init__(
        self,
        team_stat_repo: TeamStatRepository,
        player_stat_repo: PlayerStatRepository,
        unit_of_work: UnitOfWork,
        rules: BasketballScoreboardRules,
        policy: ScoreboardPolicy,
    ):
        self.team_stat_repo = team_stat_repo
        self.player_stat_repo = player_stat_repo
        self.unit_of_work = unit_of_work
        self.rules = rules
        self.policy = policy

    def apply_event(self, event: MatchEvent, direction: int) -> None:
        points = self.rules.points_for_event(event.event_type)

        if points:
            scoring_team_stat = self._get_or_create_team_stat(event.team_id)
            points_for = self.rules.increment_non_negative(scoring_team_stat.points_for, points * direction)
            self.team_stat_repo.update(
                scoring_team_stat,
                points_for=points_for,
                points_difference=points_for - scoring_team_stat.points_against,
            )

        match = self.policy.get_existing_match(event.match_id)

        opponent_team_id = match.team_b_id if event.team_id == match.team_a_id else match.team_a_id
        if points:
            opponent_team_stat = self._get_or_create_team_stat(opponent_team_id)
            points_against = self.rules.increment_non_negative(opponent_team_stat.points_against, points * direction)
            self.team_stat_repo.update(
                opponent_team_stat,
                points_against=points_against,
                points_difference=opponent_team_stat.points_for - points_against,
            )

        event_type = MatchEventType(event.event_type)

        if applies_team_foul(event_type):
            team_stat = self._get_or_create_team_stat(event.team_id)
            self.team_stat_repo.update(
                team_stat,
                total_team_fouls=self.rules.increment_non_negative(team_stat.total_team_fouls, direction),
            )

        if event.player_id is not None:
            self._apply_player_stat(event, direction, points)

    def _get_or_create_team_stat(self, team_id: int) -> TeamStat:
        team_stat = self.team_stat_repo.get(team_id)
        if team_stat:
            return team_stat

        team_stat = TeamStat(team_id=team_id)
        self.team_stat_repo.add(team_stat)
        self.unit_of_work.flush()
        return team_stat

    def _get_or_create_player_stat(self, player_id: int) -> PlayerStat:
        player_stat = self.player_stat_repo.get(player_id)
        if player_stat:
            return player_stat

        player_stat = PlayerStat(player_id=player_id)
        self.player_stat_repo.add(player_stat)
        self.unit_of_work.flush()
        return player_stat

    def _apply_player_stat(self, event: MatchEvent, direction: int, points: int) -> None:
        player_stat = self._get_or_create_player_stat(event.player_id)

        if points:
            self.player_stat_repo.update(
                player_stat,
                total_points=self.rules.increment_non_negative(player_stat.total_points, points * direction),
                **made_shot_updates(MatchEventType(event.event_type), player_stat, direction, self.rules),
            )
            return

        updates = player_event_updates(MatchEventType(event.event_type), player_stat, direction, self.rules)
        if updates:
            self.player_stat_repo.update(player_stat, **updates)
