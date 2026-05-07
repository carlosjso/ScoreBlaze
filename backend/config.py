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
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:5173")
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", APP_BASE_URL).split(",")
    if origin.strip()
]

# ==============================================================================
# DATABASE
# ==============================================================================
DB_URL = os.getenv("DB_URL") or os.getenv("DATABASE_URL")

# ==============================================================================
# AUTH / SESSION / SEED
# ==============================================================================
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "sb_session")
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "lax")
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").strip().lower() == "true"
SESSION_COOKIE_DOMAIN = os.getenv("SESSION_COOKIE_DOMAIN") or None
SESSION_IDLE_MINUTES = int(os.getenv("SESSION_IDLE_MINUTES", 30))
SESSION_ABSOLUTE_MINUTES = int(os.getenv("SESSION_ABSOLUTE_MINUTES", 480))
SESSION_ACTIVITY_GRACE_SECONDS = int(os.getenv("SESSION_ACTIVITY_GRACE_SECONDS", 45))
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
AUTH_DEFAULT_ROLE = os.getenv("AUTH_DEFAULT_ROLE", "coach").strip().lower() or "coach"
AUTH_BOOTSTRAP_ADMIN_EMAILS = {
    email.strip().lower()
    for email in os.getenv("AUTH_BOOTSTRAP_ADMIN_EMAILS", "").split(",")
    if email.strip()
}
SEED_SUPERADMIN_NAME = os.getenv("SEED_SUPERADMIN_NAME", "Super Admin").strip() or "Super Admin"
SEED_SUPERADMIN_EMAIL = os.getenv("SEED_SUPERADMIN_EMAIL", "superadmin@scoreblaze.local").strip().lower()
SEED_SUPERADMIN_PASSWORD = os.getenv("SEED_SUPERADMIN_PASSWORD", "ScoreBlaze123!")
SEED_SUPERADMIN_ROLES = tuple(
    dict.fromkeys(
        role.strip().lower()
        for role in os.getenv("SEED_SUPERADMIN_ROLES", "admin,coach").split(",")
        if role.strip()
    )
) or ("admin", "coach")
