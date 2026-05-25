from __future__ import annotations

from datetime import timedelta

import config
from utils.jwt_tokens import create_jwt

ACCOUNT_INVITATION_PURPOSE = "complete_account"


def create_account_invitation_token(
    *,
    user_id: int,
    email: str,
    role: str,
    player_id: int | None = None,
    team_id: int | None = None,
) -> str:
    payload = {
        "purpose": ACCOUNT_INVITATION_PURPOSE,
        "user_id": user_id,
        "email": email,
        "role": role,
    }
    if player_id is not None:
        payload["player_id"] = player_id
    if team_id is not None:
        payload["team_id"] = team_id

    return create_jwt(
        payload,
        expires_delta=timedelta(hours=config.ACCOUNT_INVITATION_TOKEN_EXPIRES_HOURS),
    )


def build_account_invitation_url(token: str) -> str:
    return f"{config.APP_BASE_URL.rstrip('/')}/invitation/complete?token={token}"
