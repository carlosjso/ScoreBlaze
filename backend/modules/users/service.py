from __future__ import annotations

import config
from data.orm import User
from database.unit_of_work import UnitOfWork
from modules.users.repositories import RoleRepository, UserRepository
from utils.security import hash_password

from .policy import UserPolicy
from .schemas import UserCreate, UserUpdate


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

    def create(self, data: UserCreate) -> User:
        normalized_email = str(data.email).strip().lower()
        self.policy.ensure_email_available(normalized_email)

        user = User(
            name=data.name,
            email=normalized_email,
            password_hash=hash_password(data.password),
        )
        with self.unit_of_work.transaction():
            user.roles = [self.role_repo.get_or_create(role_name) for role_name in self._resolve_registration_roles(normalized_email)]
            self.user_repo.add(user)
        self.unit_of_work.refresh(user)
        return user

    def list(self) -> list[User]:
        return self.user_repo.list()

    def get(self, user_id: int) -> User:
        return self.policy.get_existing_user(user_id)

    def update(self, user_id: int, data: UserUpdate) -> User:
        user = self.policy.get_existing_user(user_id)
        normalized_email = str(data.email).strip().lower()
        self.policy.ensure_email_available(normalized_email, current_user_id=user_id)

        password_hash = hash_password(data.password) if data.password is not None else None
        fields = {
            "name": data.name,
            "email": normalized_email,
        }
        if password_hash is not None:
            fields["password_hash"] = password_hash

        with self.unit_of_work.transaction():
            self.user_repo.update(user, **fields)
        self.unit_of_work.refresh(user)
        return user

    def delete(self, user_id: int) -> None:
        user = self.policy.get_existing_user(user_id)
        with self.unit_of_work.transaction():
            self.user_repo.soft_delete(user)
