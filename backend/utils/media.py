from __future__ import annotations

import base64

from core.exceptions import ValidationException


def decode_base64_payload(value: str | None, invalid_message: str) -> bytes | None:
    if not value:
        return None

    payload = value.strip()
    if payload.startswith("data:") and "," in payload:
        payload = payload.split(",", 1)[1]

    try:
        return base64.b64decode(payload, validate=True)
    except Exception as exc:  # pragma: no cover
        raise ValidationException(invalid_message) from exc
