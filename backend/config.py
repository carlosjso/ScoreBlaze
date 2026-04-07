from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_env: str = "development"
    app_port: int = 8000
    database_url: str
    secret_key: str
    log_level: str = "info"

    model_config = {
        "env_file": (".env", ".env.development", ".env.docker", ".env.example", ".secrets"),
        "env_file_encoding": "utf-8",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
