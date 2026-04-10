from fastapi import APIRouter

from .teams_routes import router as teams_router
from .players_routes import router as players_router
from .team_memberships_routes import router as team_memberships_router

api_router = APIRouter()
api_router.include_router(teams_router)
api_router.include_router(players_router)
api_router.include_router(team_memberships_router)

__all__ = ["api_router"]
