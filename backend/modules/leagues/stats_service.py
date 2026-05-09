from __future__ import annotations

from data.orm import LeagueStat
from database.unit_of_work import UnitOfWork
from modules.match_events.repositories import MatchEventRepository
from modules.matches.repositories import MatchRepository
from modules.players.repositories import PlayerRepository
from modules.teams.repositories import TeamRepository

from .domain import compute_league_stats_snapshot
from .policy import LeaguePolicy
from .repositories import LeagueRepository, LeagueStatRepository
from .schemas import LeagueStatsSnapshotOut


class LeagueStatsService:
    def __init__(
        self,
        league_repo: LeagueRepository,
        league_stat_repo: LeagueStatRepository,
        team_repo: TeamRepository,
        player_repo: PlayerRepository,
        match_repo: MatchRepository,
        match_event_repo: MatchEventRepository,
        unit_of_work: UnitOfWork,
        policy: LeaguePolicy,
    ):
        self.league_repo = league_repo
        self.league_stat_repo = league_stat_repo
        self.team_repo = team_repo
        self.player_repo = player_repo
        self.match_repo = match_repo
        self.match_event_repo = match_event_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    def get(self, league_id: int) -> LeagueStatsSnapshotOut:
        league = self.policy.get_existing_league(league_id)
        matches = self.match_repo.list(league_id=league.id)
        match_ids = [match.id for match in matches]
        events = self.match_event_repo.list_by_match_ids(match_ids)

        team_ids = set(league.team_ids)
        for match in matches:
            team_ids.add(match.team_a_id)
            team_ids.add(match.team_b_id)

        player_ids = sorted({event.player_id for event in events if event.player_id is not None})

        team_lookup = {team.id: team for team in self.team_repo.get_many_by_ids(sorted(team_ids))}
        player_lookup = {player.id: player for player in self.player_repo.get_many_by_ids(player_ids)}

        payload = compute_league_stats_snapshot(
            league_id=league.id,
            league_name=league.name,
            league_status=league.status,
            tracked_stats=list(league.tracked_stats or []),
            current_team_ids=league.team_ids,
            team_lookup=team_lookup,
            player_lookup=player_lookup,
            matches=matches,
            events=events,
        )

        with self.unit_of_work.transaction():
            stat_snapshot = self.league_stat_repo.get(league.id)
            if stat_snapshot is None:
                stat_snapshot = LeagueStat(league_id=league.id, stats_payload=payload)
                self.league_stat_repo.add(stat_snapshot)
                self.unit_of_work.flush()
            else:
                self.league_stat_repo.update(stat_snapshot, stats_payload=payload)

        self.unit_of_work.refresh(stat_snapshot)
        return LeagueStatsSnapshotOut.model_validate(
            {
                **payload,
                "updated_at": stat_snapshot.updated_at,
            }
        )
