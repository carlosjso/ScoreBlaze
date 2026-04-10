from fastapi import FastAPI

from routers import api_router

app = FastAPI(title="ScoreBlaze API", version="0.1.0")
app.include_router(api_router)


@app.get("/", tags=["system"])
def root():
    return {"message": "ScoreBlaze backend ready"}
