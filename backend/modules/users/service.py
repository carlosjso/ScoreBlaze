from __future__ import annotations

from math import ceil

import config
from core.exceptions import ValidationException
from data.orm import User
from database.unit_of_work import UnitOfWork
from modules.users.repositories import RoleRepository, UserRepository
from utils.security import hash_password

from .policy import UserPolicy
from .schemas import UserCreate, UserOut, UserTableItem, UserTablePageOut, UserUpdate


class UserService:
    def __init__(
        self,
        user_repo: UserRepository,
        role_repo: RoleRepository,
        unit_of_work: UnitOfWork,
        policy: UserPolicy,
    ):
        self.user_repo = user_repo
        self.role_repo = role_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    def _resolve_registration_roles(self, email: str) -> list[str]:
        normalized_email = email.strip().lower()
        if normalized_email in config.AUTH_BOOTSTRAP_ADMIN_EMAILS:
            return list(dict.fromkeys(["admin", config.AUTH_DEFAULT_ROLE]))
        return [config.AUTH_DEFAULT_ROLE]

    def _normalize_role_name(self, value: str | None) -> str | None:
        if value is None:
            return None

        normalized_role_name = value.strip().lower()
        return normalized_role_name or None

    def _normalize_name(self, value: str) -> str:
        normalized_name = value.strip()
        if not normalized_name:
            raise ValidationException("El nombre del usuario es obligatorio.")
        return normalized_name

    def _serialize_user(self, user: User) -> UserOut:
        role_names = sorted({role.name for role in getattr(user, "roles", [])})
        return UserOut(
            id=user.id,
            name=user.name,
            email=user.email,
            created_at=user.created_at,
            roles=role_names,
        )

    def create(self, data: UserCreate) -> User:
        normalized_email = str(data.email).strip().lower()
        self.policy.ensure_email_available(normalized_email)

        user = User(
            name=self._normalize_name(data.name),
            email=normalized_email,
            password_hash=hash_password(data.password),
        )
        explicit_role_name = self._normalize_role_name(data.role_name)
        with self.unit_of_work.transaction():
            role_names = [explicit_role_name] if explicit_role_name else self._resolve_registration_roles(normalized_email)
            user.roles = [self.role_repo.get_or_create(role_name) for role_name in role_names]
            self.user_repo.add(user)
        self.unit_of_work.refresh(user)
        return user

    def list(self) -> list[User]:
        return self.user_repo.list()

    def list_out(self) -> list[UserOut]:
        return [self._serialize_user(user) for user in self.list()]

    def get(self, user_id: int) -> User:
        return self.policy.get_existing_user(user_id)

    def get_out(self, user_id: int) -> UserOut:
        return self._serialize_user(self.get(user_id))

    def get_table_page(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        sort_key: str,
        sort_dir: str,
    ) -> UserTablePageOut:
        normalized_page = max(1, page)
        normalized_page_size = max(1, page_size)
        rows, total_items = self.user_repo.get_table_page(
            page=normalized_page,
            page_size=normalized_page_size,
            search=search,
            sort_key=sort_key,
            sort_dir=sort_dir,
        )
        total_pages = max(1, ceil(total_items / normalized_page_size))
        items = [
            UserTableItem(
                **self._serialize_user(user).model_dump(),
                role_count=len({role.name for role in getattr(user, "roles", [])}),
            )
            for user in rows
        ]
        return UserTablePageOut(
            items=items,
            page=min(normalized_page, total_pages),
            page_size=normalized_page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

    def update(self, user_id: int, data: UserUpdate) -> User:
        user = self.policy.get_existing_user(user_id)
        normalized_email = str(data.email).strip().lower()
        self.policy.ensure_email_available(normalized_email, current_user_id=user_id)

        password_hash = hash_password(data.password) if data.password is not None else None
        fields = {
            "name": self._normalize_name(data.name),
            "email": normalized_email,
        }
        if password_hash is not None:
            fields["password_hash"] = password_hash
        explicit_role_name = self._normalize_role_name(data.role_name)

        with self.unit_of_work.transaction():
            self.user_repo.update(user, **fields)
            if explicit_role_name is not None:
                user.roles = [self.role_repo.get_or_create(explicit_role_name)]
        self.unit_of_work.refresh(user)
        return user

    def delete(self, user_id: int) -> None:
        user = self.policy.get_existing_user(user_id)
        with self.unit_of_work.transaction():
            self.user_repo.soft_delete(user)

    def create_out(self, data: UserCreate) -> UserOut:
        return self._serialize_user(self.create(data))

    def update_out(self, user_id: int, data: UserUpdate) -> UserOut:
        return self._serialize_user(self.update(user_id, data))
