from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from pydantic import ValidationError

from authentication.dependencies import get_auth_service, get_websocket_auth_context, has_required_role
from authentication.service import AuthService

from .domain import ScoreboardRealtimeMessageType, ScoreboardRealtimeRole
from .realtime import scoreboard_realtime_hub
from .schemas import ScoreboardRealtimeStateMessage

router = APIRouter()


@router.websocket("/ws/scoreboard/{match_id}")
async def scoreboard_realtime_websocket(
    websocket: WebSocket,
    match_id: int,
    auth_service: AuthService = Depends(get_auth_service),
):
    raw_role = websocket.query_params.get("role", ScoreboardRealtimeRole.LIVE).strip().lower()

    try:
        role = ScoreboardRealtimeRole(raw_role)
    except ValueError:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Invalid scoreboard realtime role.",
        )
        return

    if role == ScoreboardRealtimeRole.CONTROL:
        auth_context = await get_websocket_auth_context(websocket, auth_service, touch=True)
        if auth_context is None:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Authentication required for control channel.",
            )
            return

        allowed_roles = {"admin", "coach"}
        current_roles = {role_name.strip().lower() for role_name in auth_context.user.roles}
        if not has_required_role(current_roles, allowed_roles):
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Insufficient role for control channel.",
            )
            return

    latest_state = await scoreboard_realtime_hub.connect(match_id, websocket)

    try:
        if latest_state is not None:
            await websocket.send_json(
                {
                    "type": ScoreboardRealtimeMessageType.SCOREBOARD_STATE,
                    "payload": latest_state,
                }
            )

        while True:
            raw_message = await websocket.receive_json()

            if role != ScoreboardRealtimeRole.CONTROL:
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
