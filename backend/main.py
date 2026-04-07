from fastapi import FastAPI

from config import settings

app = FastAPI(title="ScoreBlaze API", version="0.1.0")


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "env": settings.app_env}


@app.get("/")
def root():
    return {"message": "ScoreBlaze backend ready"}
