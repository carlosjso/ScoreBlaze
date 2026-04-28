from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from pydantic import ValidationError

from data.models import ScoreboardRealtimeStateMessage
from realtime import scoreboard_realtime_hub

router = APIRouter(tags=["scoreboard-realtime"])


@router.websocket("/ws/scoreboard/{match_id}")
async def scoreboard_websocket(websocket: WebSocket, match_id: int):
    role = websocket.query_params.get("role", "live").strip().lower()

    if role not in {"control", "live"}:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Invalid scoreboard realtime role.",
        )
        return

    latest_state = await scoreboard_realtime_hub.connect(match_id, websocket)

    try:
        if latest_state is not None:
            await websocket.send_json(
                {
                    "type": "scoreboard_state",
                    "payload": latest_state,
                }
            )

        while True:
            raw_message = await websocket.receive_json()

            if role != "control":
                continue

            message = ScoreboardRealtimeStateMessage.model_validate(raw_message)
            await scoreboard_realtime_hub.publish(
                match_id,
                message.payload,
                sender=websocket,
            )
    except WebSocketDisconnect:
        pass
    except ValidationError:
        await websocket.close(
            code=status.WS_1003_UNSUPPORTED_DATA,
            reason="Invalid realtime scoreboard payload.",
        )
    finally:
        await scoreboard_realtime_hub.disconnect(match_id, websocket)
