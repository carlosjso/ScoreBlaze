from pathlib import Path
import os

from dotenv import load_dotenv

# ==============================================================================
# ENVIRONMENT CONFIGURATION
# ==============================================================================
BASE_DIR = Path(__file__).parent
ENV_FILE = os.getenv("ENV_FILE")

# Carga variables: prioridad ENV_FILE si está definido; de lo contrario intenta .env, .env.development, .env.example
if ENV_FILE:
    load_dotenv(BASE_DIR / ENV_FILE)
else:
    for candidate in (".env", ".env.development", ".env.example"):
        load_dotenv(BASE_DIR / candidate, override=False)

# ==============================================================================
# BASIC SETTINGS
# ==============================================================================
APP_ENV = os.getenv("APP_ENV", "development")
APP_PORT = int(os.getenv("APP_PORT", 8000))
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")
SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

# ==============================================================================
# DATABASE
# ==============================================================================
DB_URL = os.getenv("DB_URL") or os.getenv("DATABASE_URL")
