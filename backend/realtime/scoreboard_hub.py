from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

from data.models import ScoreboardRealtimeState


class ScoreboardRealtimeHub:
    def __init__(self):
        self._connections: dict[int, set[WebSocket]] = defaultdict(set)
        self._states: dict[int, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, match_id: int, websocket: WebSocket) -> dict[str, Any] | None:
        await websocket.accept()

        async with self._lock:
            self._connections[match_id].add(websocket)
            return self._states.get(match_id)

    async def disconnect(self, match_id: int, websocket: WebSocket) -> None:
        async with self._lock:
            connections = self._connections.get(match_id)
            if not connections:
                return

            connections.discard(websocket)
            if not connections:
                self._connections.pop(match_id, None)

    async def publish(
        self,
        match_id: int,
        state: ScoreboardRealtimeState,
        sender: WebSocket | None = None,
    ) -> None:
        payload = state.model_dump(mode="json")

        async with self._lock:
            self._states[match_id] = payload
            targets = list(self._connections.get(match_id, set()))

        disconnected: list[WebSocket] = []
        message = {
            "type": "scoreboard_state",
            "payload": payload,
        }

        for connection in targets:
            if sender is not None and connection is sender:
                continue

            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            await self.disconnect(match_id, connection)

    async def get_state(self, match_id: int) -> dict[str, Any] | None:
        async with self._lock:
            state = self._states.get(match_id)
            if state is None:
                return None
            return dict(state)


scoreboard_realtime_hub = ScoreboardRealtimeHub()
