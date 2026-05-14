from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

from fastapi import Depends, Request, Response, WebSocket

import config
from core.exceptions import ForbiddenException, UnauthorizedException
from modules.users.dependencies import get_user_repository, get_user_service
from modules.users.repositories import UserRepository
from modules.users.service import UserService

from .schemas import AuthUserOut
from .service import AuthService
from .session_store import BaseSessionStore, build_session_store

SUPERADMIN_ROLE_NAME = "superadmin"


@dataclass
class AuthContext:
    user: AuthUserOut
    session_id: str


@lru_cache(maxsize=1)
def _get_session_store_singleton() -> BaseSessionStore:
    return build_session_store()


def get_session_store() -> BaseSessionStore:
    return _get_session_store_singleton()


def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repository),
    user_service: UserService = Depends(get_user_service),
    session_store: BaseSessionStore = Depends(get_session_store),
) -> AuthService:
    return AuthService(
        user_repo=user_repo,
        user_service=user_service,
        session_store=session_store,
    )


def get_session_cookie_max_age_seconds() -> int:
    return max(1, config.SESSION_ABSOLUTE_MINUTES * 60)


def set_auth_session_cookie(response: Response, session_id: str) -> None:
    response.set_cookie(
        key=config.SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=config.SESSION_COOKIE_SECURE,
        samesite=config.SESSION_COOKIE_SAMESITE,
        domain=config.SESSION_COOKIE_DOMAIN,
        path="/",
        max_age=get_session_cookie_max_age_seconds(),
    )


def clear_auth_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=config.SESSION_COOKIE_NAME,
        domain=config.SESSION_COOKIE_DOMAIN,
        path="/",
    )


def get_session_id_from_request(request: Request) -> str | None:
    return request.cookies.get(config.SESSION_COOKIE_NAME)


async def get_optional_auth_context(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthContext | None:
    session_id = get_session_id_from_request(request)
    if not session_id:
        return None

    resolved = await auth_service.get_user_for_session(session_id, touch=True)
    if resolved is None:
        return None

    auth_session, session = resolved
    request.state.auth_user = auth_session.user
    request.state.session_id = session.session_id
    return AuthContext(user=auth_session.user, session_id=session.session_id)


async def require_authenticated_user(
    auth_context: AuthContext | None = Depends(get_optional_auth_context),
) -> AuthUserOut:
    if auth_context is None:
        raise UnauthorizedException("Autenticacion requerida.")
    return auth_context.user


def has_required_role(current_roles: set[str], required_roles: set[str]) -> bool:
    if SUPERADMIN_ROLE_NAME in current_roles:
        return True
    return not required_roles.isdisjoint(current_roles)


def has_required_permission(
    current_roles: set[str],
    current_permissions: set[str],
    required_permissions: set[str],
) -> bool:
    if SUPERADMIN_ROLE_NAME in current_roles:
        return True
    return required_permissions.issubset(current_permissions)


def has_any_required_permission(
    current_roles: set[str],
    current_permissions: set[str],
    required_permissions: set[str],
) -> bool:
    if SUPERADMIN_ROLE_NAME in current_roles:
        return True
    return not required_permissions.isdisjoint(current_permissions)


def require_roles(*required_roles: str):
    normalized_required_roles = {role.strip().lower() for role in required_roles if role.strip()}

    async def dependency(
        current_user: AuthUserOut = Depends(require_authenticated_user),
    ) -> AuthUserOut:
        current_roles = {role.strip().lower() for role in current_user.roles}
        if not has_required_role(current_roles, normalized_required_roles):
            raise ForbiddenException("No tienes permisos para realizar esta accion.")
        return current_user

    return dependency


def require_permissions(*required_permissions: str):
    normalized_required_permissions = {
        permission.strip().lower()
        for permission in required_permissions
        if permission.strip()
    }

    async def dependency(
        current_user: AuthUserOut = Depends(require_authenticated_user),
    ) -> AuthUserOut:
        current_roles = {role.strip().lower() for role in current_user.roles}
        current_permissions = {permission.strip().lower() for permission in current_user.permissions}
        if not has_required_permission(current_roles, current_permissions, normalized_required_permissions):
            raise ForbiddenException("No tienes permisos para realizar esta accion.")
        return current_user

    return dependency


def require_any_permission(*required_permissions: str):
    normalized_required_permissions = {
        permission.strip().lower()
        for permission in required_permissions
        if permission.strip()
    }

    async def dependency(
        current_user: AuthUserOut = Depends(require_authenticated_user),
    ) -> AuthUserOut:
        current_roles = {role.strip().lower() for role in current_user.roles}
        current_permissions = {permission.strip().lower() for permission in current_user.permissions}
        if not has_any_required_permission(current_roles, current_permissions, normalized_required_permissions):
            raise ForbiddenException("No tienes permisos para realizar esta accion.")
        return current_user

    return dependency


async def get_websocket_auth_context(
    websocket: WebSocket,
    auth_service: AuthService,
    *,
    touch: bool,
) -> AuthContext | None:
    session_id = websocket.cookies.get(config.SESSION_COOKIE_NAME)
    if not session_id:
        return None

    resolved = await auth_service.get_user_for_session(session_id, touch=touch)
    if resolved is None:
        return None

    auth_session, session = resolved
    return AuthContext(user=auth_session.user, session_id=session.session_id)
