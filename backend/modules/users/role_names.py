from __future__ import annotations


USER_ROLE_NAME = "usuario"
REFEREE_ROLE_NAME = "arbitro"
COACH_ROLE_NAME = "coach"
CAPTAIN_ROLE_NAME = "capitan"
PLAYER_ROLE_NAME = "jugador"
ADMINISTRATOR_ROLE_NAME = "administrador"
SUPERADMIN_ROLE_NAME = "superadmin"

# Keep the legacy name so existing accounts retain their global scope.
LEGACY_ADMIN_ROLE_NAME = "admin"

DEFAULT_ROLE_NAMES = (
    USER_ROLE_NAME,
    REFEREE_ROLE_NAME,
    COACH_ROLE_NAME,
    CAPTAIN_ROLE_NAME,
    PLAYER_ROLE_NAME,
    ADMINISTRATOR_ROLE_NAME,
)

GLOBAL_SCOPE_ROLE_NAMES = frozenset(
    {
        LEGACY_ADMIN_ROLE_NAME,
        ADMINISTRATOR_ROLE_NAME,
        SUPERADMIN_ROLE_NAME,
    }
)
TEAM_MANAGER_ROLE_NAMES = frozenset({COACH_ROLE_NAME, CAPTAIN_ROLE_NAME})
