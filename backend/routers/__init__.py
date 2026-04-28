from fastapi import APIRouter

from .matches_routes import router as matches_router
from .match_events_routes import router as match_events_router
from .players_routes import router as players_router
from .player_stats_routes import router as player_stats_router
from .scoreboard_ws_routes import router as scoreboard_ws_router
from .teams_routes import router as teams_router
from .team_stats_routes import router as team_stats_router
from .team_memberships_routes import router as team_memberships_router
from .users_routes import router as users_router

api_router = APIRouter()
api_router.include_router(matches_router)
api_router.include_router(match_events_router)
api_router.include_router(players_router)
api_router.include_router(player_stats_router)
api_router.include_router(scoreboard_ws_router)
api_router.include_router(teams_router)
api_router.include_router(team_stats_router)
api_router.include_router(team_memberships_router)
api_router.include_router(users_router)

__all__ = ["api_router"]
