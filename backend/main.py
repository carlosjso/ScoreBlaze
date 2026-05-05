import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import config
import database.alchemy as db
from core.exceptions.handlers import register_exception_handlers
from modules.match_events.router import router as match_events_router
from modules.matches.router import router as matches_router
from modules.memberships.router import router as memberships_router
from modules.players.router import router as players_router
from modules.scoreboard.realtime_router import router as scoreboard_realtime_router
from modules.statistics.player_stats_router import router as player_stats_router
from modules.statistics.team_stats_router import router as team_stats_router
from modules.teams.router import router as teams_router
from modules.users.router import router as users_router

logging.basicConfig(level=str(config.LOG_LEVEL).upper())

app = FastAPI(title="ScoreBlaze API", version="0.1.0")
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["system"])
def root():
    return {"message": "ScoreBlaze backend ready"}


app.include_router(matches_router, prefix="/matches", tags=["matches"])
app.include_router(match_events_router, prefix="/match-events", tags=["match-events"])
app.include_router(players_router, prefix="/players", tags=["players"])
app.include_router(player_stats_router, prefix="/player-stats", tags=["player-stats"])
app.include_router(scoreboard_realtime_router, tags=["scoreboard-realtime"])
app.include_router(teams_router, prefix="/teams", tags=["teams"])
app.include_router(team_stats_router, prefix="/team-stats", tags=["team-stats"])
app.include_router(memberships_router, prefix="/team-memberships", tags=["team-memberships"])
app.include_router(users_router, prefix="/users", tags=["users"])

get_db = db.get_db
