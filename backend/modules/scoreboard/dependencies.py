from fastapi import Depends

from database.dependencies import get_unit_of_work
from database.unit_of_work import UnitOfWork
from modules.access_scope import TeamAccessScopeResolver
from modules.match_events.repositories import MatchEventRepository
from modules.match_participations.repositories import MatchPlayerParticipationRepository
from modules.matches.repositories import MatchRepository
from modules.memberships.repositories import MembershipRepository
from modules.players.repositories import PlayerRepository
from modules.scoreboard.domain import BasketballScoreboardRules
from modules.statistics.repositories import PlayerStatRepository, TeamStatRepository
from modules.teams.repositories import TeamRepository

from .actor_resolver import ScoreboardActorResolver
from .policy import ScoreboardPolicy
from .score_projector import ScoreboardScoreProjector
from .service import ScoreboardService
from .snapshot_builder import ScoreboardSnapshotBuilder
from .stat_projection_service import ScoreboardStatProjectionService


def get_scoreboard_rules() -> BasketballScoreboardRules:
    return BasketballScoreboardRules()


def get_scoreboard_service(
    unit_of_work: UnitOfWork = Depends(get_unit_of_work),
    rules: BasketballScoreboardRules = Depends(get_scoreboard_rules),
) -> ScoreboardService:
    db = unit_of_work.db
    match_repo = MatchRepository(db)
    match_event_repo = MatchEventRepository(db)
    match_participation_repo = MatchPlayerParticipationRepository(db)
    team_repo = TeamRepository(db)
    player_repo = PlayerRepository(db)
    membership_repo = MembershipRepository(db)
    policy = ScoreboardPolicy(match_repo)
    scope_resolver = TeamAccessScopeResolver(team_repo, player_repo, membership_repo)
    actor_resolver = ScoreboardActorResolver(
        team_repo=team_repo,
        player_repo=player_repo,
        membership_repo=membership_repo,
        rules=rules,
    )

    return ScoreboardService(
        match_repo=match_repo,
        match_event_repo=match_event_repo,
        match_participation_repo=match_participation_repo,
        actor_resolver=actor_resolver,
        stat_projection_service=ScoreboardStatProjectionService(
            team_stat_repo=TeamStatRepository(db),
            player_stat_repo=PlayerStatRepository(db),
            unit_of_work=unit_of_work,
            rules=rules,
            policy=policy,
        ),
        score_projector=ScoreboardScoreProjector(rules),
        snapshot_builder=ScoreboardSnapshotBuilder(
            actor_resolver=actor_resolver,
            participation_repo=match_participation_repo,
            membership_repo=membership_repo,
            player_repo=player_repo,
        ),
        scope_resolver=scope_resolver,
        unit_of_work=unit_of_work,
        policy=policy,
    )
