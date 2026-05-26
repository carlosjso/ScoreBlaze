from __future__ import annotations

from datetime import datetime

from core.exceptions import UnauthorizedException
from modules.users.repositories import UserRepository
from modules.users.schemas import UserCreate
from modules.users.service import UserService
from utils.security import verify_password

from .schemas import AuthLoginRequest, AuthRegisterRequest, AuthSessionOut, AuthUserOut
from .session_store import BaseSessionStore, SessionPayload


class AuthService:
    def __init__(
        self,
        user_repo: UserRepository,
        user_service: UserService,
        session_store: BaseSessionStore,
    ):
        self.user_repo = user_repo
        self.user_service = user_service
        self.session_store = session_store

    @staticmethod
    def _serialize_user(user) -> AuthUserOut:
        role_names = sorted({role.name for role in getattr(user, "roles", [])})
        permission_names = sorted(
            {
                permission.name
                for role in getattr(user, "roles", [])
                for permission in getattr(role, "permissions", [])
            }
        )
        created_at = user.created_at
        if isinstance(created_at, datetime):
            normalized_created_at = created_at
        else:  # pragma: no cover - defensive
            normalized_created_at = datetime.fromisoformat(str(created_at))

        return AuthUserOut(
            id=user.id,
            name=user.name,
            email=user.email,
            roles=role_names,
            permissions=permission_names,
            created_at=normalized_created_at,
        )

    def _build_session_out(self, user) -> AuthSessionOut:
        return AuthSessionOut(user=self._serialize_user(user))

    def authenticate_credentials(self, credentials: AuthLoginRequest):
        normalized_email = str(credentials.email).strip().lower()
        user = self.user_repo.get_by_email(normalized_email)
        if (
            user is None
            or getattr(user, "account_status", "active") != "active"
            or not user.password_hash
            or not verify_password(credentials.password, user.password_hash)
        ):
            raise UnauthorizedException("Credenciales inválidas.")
        return user

    async def login(self, credentials: AuthLoginRequest) -> tuple[AuthSessionOut, SessionPayload]:
        user = self.authenticate_credentials(credentials)
        session = await self.session_store.create_session(user.id)
        return self._build_session_out(user), session

    async def register(self, payload: AuthRegisterRequest) -> tuple[AuthSessionOut, SessionPayload]:
        user = self.user_service.create(
            UserCreate(
                name=payload.name,
                email=payload.email,
                password=payload.password,
            )
        )
        session = await self.session_store.create_session(user.id)
        return self._build_session_out(user), session

    async def get_user_for_session(self, session_id: str, *, touch: bool) -> tuple[AuthSessionOut, SessionPayload] | None:
        session = await (self.session_store.touch_session(session_id) if touch else self.session_store.get_session(session_id))
        if session is None:
            return None

        user = self.user_repo.get(session.user_id)
        if user is None:
            await self.session_store.delete_session(session.session_id)
            return None

        return self._build_session_out(user), session

    async def logout(self, session_id: str) -> None:
        await self.session_store.delete_session(session_id)
