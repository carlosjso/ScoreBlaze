from data.orm import PlayerStat
from database.unit_of_work import UnitOfWork
from modules.match_events.domain import MatchEventStatus, MatchEventType
from modules.match_events.repositories import MatchEventRepository
from modules.match_participations.repositories import MatchPlayerParticipationRepository
from modules.matches.domain import MatchStatus
from modules.matches.repositories import MatchRepository
from modules.matches.tracked_stats import does_track_stat
from modules.statistics.repositories import PlayerStatRepository

from .policy import PlayerStatPolicy
from .schemas import PlayerStatCreate, PlayerStatOut, PlayerStatUpdate


class PlayerStatService:
    def __init__(
        self,
        player_stat_repo: PlayerStatRepository,
        match_repo: MatchRepository,
        match_event_repo: MatchEventRepository,
        match_participation_repo: MatchPlayerParticipationRepository,
        unit_of_work: UnitOfWork,
        policy: PlayerStatPolicy,
    ):
        self.player_stat_repo = player_stat_repo
        self.match_repo = match_repo
        self.match_event_repo = match_event_repo
        self.match_participation_repo = match_participation_repo
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

    def get(self, player_id: int) -> PlayerStatOut:
        self.policy.ensure_player_exists(player_id)

        participations = self.match_participation_repo.list_by_player(player_id)
        events = self.match_event_repo.list_by_player(player_id)
        match_ids = sorted({participation.match_id for participation in participations} | {event.match_id for event in events})

        if not match_ids:
            return self.policy.get_existing_player_stat(player_id)

        matches_by_id = {match.id: match for match in self.match_repo.list_by_ids(match_ids)}
        relevant_statuses = {MatchStatus.LIVE.value, MatchStatus.FINISHED.value}
        played_match_ids: set[int] = set()
        updated_at_candidates = []

        for participation in participations:
            match = matches_by_id.get(participation.match_id)
            if not match or match.status not in relevant_statuses or not participation.played:
                continue

            played_match_ids.add(participation.match_id)
            updated_at_candidates.append(participation.updated_at)

        total_points = 0
        made_1pt = 0
        made_2pt = 0
        made_3pt = 0
        missed_shots = 0
        total_assists = 0
        total_rebounds = 0
        total_fouls = 0
        tracked_made_shots = 0
        tracked_shot_attempts = 0
        has_tracked_shooting = False

        for event in events:
            match = matches_by_id.get(event.match_id)
            if not match or match.status not in relevant_statuses or event.status != MatchEventStatus.ACTIVE.value:
                continue

            played_match_ids.add(event.match_id)
            updated_at_candidates.append(event.created_at)
            event_type = MatchEventType(event.event_type)
            tracks_missed_shots = does_track_stat("Fallo", getattr(match, "tracked_stats", None))

            if event_type == MatchEventType.POINT_1:
                total_points += 1
                made_1pt += 1
                if tracks_missed_shots:
                    tracked_made_shots += 1
                    tracked_shot_attempts += 1
                    has_tracked_shooting = True
                continue

            if event_type == MatchEventType.POINT_2:
                total_points += 2
                made_2pt += 1
                if tracks_missed_shots:
                    tracked_made_shots += 1
                    tracked_shot_attempts += 1
                    has_tracked_shooting = True
                continue

            if event_type == MatchEventType.POINT_3:
                total_points += 3
                made_3pt += 1
                if tracks_missed_shots:
                    tracked_made_shots += 1
                    tracked_shot_attempts += 1
                    has_tracked_shooting = True
                continue

            if event_type == MatchEventType.MISS and tracks_missed_shots:
                missed_shots += 1
                tracked_shot_attempts += 1
                has_tracked_shooting = True
                continue

            if event_type == MatchEventType.ASSIST and does_track_stat("Asistencias", getattr(match, "tracked_stats", None)):
                total_assists += 1
                continue

            if event_type == MatchEventType.REBOUND and does_track_stat("Rebotes", getattr(match, "tracked_stats", None)):
                total_rebounds += 1
                continue

            if event_type == MatchEventType.FOUL and does_track_stat("Faltas", getattr(match, "tracked_stats", None)):
                total_fouls += 1

        if not played_match_ids:
            return self.policy.get_existing_player_stat(player_id)

        updated_at = max(updated_at_candidates)
        shooting_accuracy = (
            (tracked_made_shots / tracked_shot_attempts) * 100
            if tracked_shot_attempts > 0
            else None
        )

        return PlayerStatOut(
            player_id=player_id,
            matches_played=len(played_match_ids),
            total_points=total_points,
            made_1pt=made_1pt,
            made_2pt=made_2pt,
            made_3pt=made_3pt,
            missed_shots=missed_shots,
            total_assists=total_assists,
            total_rebounds=total_rebounds,
            total_fouls=total_fouls,
            tracked_made_shots=tracked_made_shots if has_tracked_shooting else None,
            tracked_shot_attempts=tracked_shot_attempts if has_tracked_shooting else None,
            shooting_accuracy=shooting_accuracy,
            updated_at=updated_at,
        )

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
