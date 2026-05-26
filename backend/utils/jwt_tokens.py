from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import datetime, timedelta, timezone
from typing import Any

import config
from core.exceptions import UnauthorizedException


def _base64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _base64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def _sign(value: str) -> str:
    digest = hmac.new(config.SECRET_KEY.encode("utf-8"), value.encode("ascii"), hashlib.sha256).digest()
    return _base64url_encode(digest)


def create_jwt(payload: dict[str, Any], *, expires_delta: timedelta) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    expires_at = datetime.now(timezone.utc) + expires_delta
    token_payload = {**payload, "exp": int(expires_at.timestamp())}
    encoded_header = _base64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _base64url_encode(json.dumps(token_payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}"
    return f"{signing_input}.{_sign(signing_input)}"


def decode_jwt(token: str) -> dict[str, Any]:
    try:
        encoded_header, encoded_payload, signature = token.split(".", maxsplit=2)
    except ValueError as exc:
        raise UnauthorizedException("Token invalido.") from exc

    signing_input = f"{encoded_header}.{encoded_payload}"
    expected_signature = _sign(signing_input)
    if not hmac.compare_digest(signature, expected_signature):
        raise UnauthorizedException("Token invalido.")

    try:
        header = json.loads(_base64url_decode(encoded_header))
        payload = json.loads(_base64url_decode(encoded_payload))
    except (ValueError, json.JSONDecodeError) as exc:
        raise UnauthorizedException("Token invalido.") from exc

    if header.get("alg") != "HS256" or header.get("typ") != "JWT":
        raise UnauthorizedException("Token invalido.")

    expires_at = payload.get("exp")
    if not isinstance(expires_at, int) or expires_at < int(datetime.now(timezone.utc).timestamp()):
        raise UnauthorizedException("Token expirado.")

    return payload
