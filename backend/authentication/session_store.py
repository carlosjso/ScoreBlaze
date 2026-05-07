from __future__ import annotations

import json
import logging
import secrets
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

import config

logger = logging.getLogger(__name__)

SESSION_KEY_PREFIX = "scoreblaze:session:"


class SessionPayload:
    def __init__(
        self,
        *,
        session_id: str,
        user_id: int,
        created_at: datetime,
        last_activity_at: datetime,
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.created_at = created_at
        self.last_activity_at = last_activity_at

    def to_dict(self) -> dict[str, str | int]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "created_at": self.created_at.isoformat(),
            "last_activity_at": self.last_activity_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, payload: dict[str, str | int]) -> "SessionPayload":
        return cls(
            session_id=str(payload["session_id"]),
            user_id=int(payload["user_id"]),
            created_at=datetime.fromisoformat(str(payload["created_at"])),
            last_activity_at=datetime.fromisoformat(str(payload["last_activity_at"])),
        )


class BaseSessionStore:
    def __init__(self, idle_timeout_minutes: int, absolute_timeout_minutes: int):
        self.idle_timeout = timedelta(minutes=idle_timeout_minutes)
        self.absolute_timeout = timedelta(minutes=absolute_timeout_minutes)

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)

    def _has_exceeded_absolute_timeout(self, payload: SessionPayload) -> bool:
        return self._now() - payload.created_at > self.absolute_timeout

    def _ttl_seconds(self) -> int:
        return max(1, int(self.idle_timeout.total_seconds()))


class InMemorySessionStore(BaseSessionStore):
    def __init__(self, idle_timeout_minutes: int, absolute_timeout_minutes: int):
        super().__init__(idle_timeout_minutes, absolute_timeout_minutes)
        self._lock = threading.Lock()
        self._sessions: dict[str, tuple[SessionPayload, datetime]] = {}

    def _read_valid_payload(self, session_id: str) -> Optional[SessionPayload]:
        with self._lock:
            session_entry = self._sessions.get(session_id)
            if session_entry is None:
                return None

            payload, expires_at = session_entry
            now = self._now()
            if now >= expires_at or self._has_exceeded_absolute_timeout(payload):
                self._sessions.pop(session_id, None)
                return None

            return payload

    async def create_session(self, user_id: int) -> SessionPayload:
        now = self._now()
        payload = SessionPayload(
            session_id=secrets.token_urlsafe(32),
            user_id=user_id,
            created_at=now,
            last_activity_at=now,
        )
        with self._lock:
            self._sessions[payload.session_id] = (payload, now + self.idle_timeout)
        return payload

    async def get_session(self, session_id: str) -> Optional[SessionPayload]:
        return self._read_valid_payload(session_id)

    async def touch_session(self, session_id: str) -> Optional[SessionPayload]:
        payload = self._read_valid_payload(session_id)
        if payload is None:
            return None

        now = self._now()
        payload.last_activity_at = now
        with self._lock:
            self._sessions[session_id] = (payload, now + self.idle_timeout)
        return payload

    async def delete_session(self, session_id: str) -> None:
        with self._lock:
            self._sessions.pop(session_id, None)


class RedisSessionStore(BaseSessionStore):
    def __init__(self, redis_url: str, idle_timeout_minutes: int, absolute_timeout_minutes: int):
        super().__init__(idle_timeout_minutes, absolute_timeout_minutes)
        self.redis_url = redis_url
        self._client = None

    async def _get_client(self):
        if self._client is not None:
            return self._client

        try:
            from redis.asyncio import Redis
        except ImportError as exc:  # pragma: no cover - depends on runtime env
            raise RuntimeError("redis package is not installed.") from exc

        client = Redis.from_url(self.redis_url, decode_responses=True)
        await client.ping()
        self._client = client
        return client

    def _key(self, session_id: str) -> str:
        return f"{SESSION_KEY_PREFIX}{session_id}"

    async def create_session(self, user_id: int) -> SessionPayload:
        client = await self._get_client()
        now = self._now()
        payload = SessionPayload(
            session_id=secrets.token_urlsafe(32),
            user_id=user_id,
            created_at=now,
            last_activity_at=now,
        )
        await client.set(self._key(payload.session_id), json.dumps(payload.to_dict()), ex=self._ttl_seconds())
        return payload

    async def get_session(self, session_id: str) -> Optional[SessionPayload]:
        client = await self._get_client()
        raw_payload = await client.get(self._key(session_id))
        if raw_payload is None:
            return None

        payload = SessionPayload.from_dict(json.loads(raw_payload))
        if self._has_exceeded_absolute_timeout(payload):
            await client.delete(self._key(session_id))
            return None

        return payload

    async def touch_session(self, session_id: str) -> Optional[SessionPayload]:
        payload = await self.get_session(session_id)
        if payload is None:
            return None

        payload.last_activity_at = self._now()
        client = await self._get_client()
        await client.set(self._key(session_id), json.dumps(payload.to_dict()), ex=self._ttl_seconds())
        return payload

    async def delete_session(self, session_id: str) -> None:
        client = await self._get_client()
        await client.delete(self._key(session_id))


class FallbackSessionStore(BaseSessionStore):
    def __init__(self, primary: BaseSessionStore, fallback: BaseSessionStore):
        super().__init__(
            idle_timeout_minutes=config.SESSION_IDLE_MINUTES,
            absolute_timeout_minutes=config.SESSION_ABSOLUTE_MINUTES,
        )
        self.primary = primary
        self.fallback = fallback
        self._using_fallback = False

    async def _run(self, method_name: str, *args):
        store = self.fallback if self._using_fallback else self.primary
        method = getattr(store, method_name)

        try:
            return await method(*args)
        except Exception as exc:  # pragma: no cover - depends on runtime env
            if self._using_fallback:
                raise

            logger.warning("Redis session store failed. Falling back to in-memory sessions. %s", exc)
            self._using_fallback = True
            fallback_method = getattr(self.fallback, method_name)
            return await fallback_method(*args)

    async def create_session(self, user_id: int) -> SessionPayload:
        return await self._run("create_session", user_id)

    async def get_session(self, session_id: str) -> Optional[SessionPayload]:
        return await self._run("get_session", session_id)

    async def touch_session(self, session_id: str) -> Optional[SessionPayload]:
        return await self._run("touch_session", session_id)

    async def delete_session(self, session_id: str) -> None:
        await self._run("delete_session", session_id)


def build_session_store() -> BaseSessionStore:
    fallback_store = InMemorySessionStore(
        idle_timeout_minutes=config.SESSION_IDLE_MINUTES,
        absolute_timeout_minutes=config.SESSION_ABSOLUTE_MINUTES,
    )
    redis_store = RedisSessionStore(
        redis_url=config.REDIS_URL,
        idle_timeout_minutes=config.SESSION_IDLE_MINUTES,
        absolute_timeout_minutes=config.SESSION_ABSOLUTE_MINUTES,
    )
    return FallbackSessionStore(redis_store, fallback_store)
