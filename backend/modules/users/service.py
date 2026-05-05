from __future__ import annotations

from data.orm import User
from database.unit_of_work import UnitOfWork
from modules.users.repositories import UserRepository
from utils.security import hash_password

from .policy import UserPolicy
from .schemas import UserCreate, UserUpdate


class UserService:
    def __init__(
        self,
        user_repo: UserRepository,
        unit_of_work: UnitOfWork,
        policy: UserPolicy,
    ):
        self.user_repo = user_repo
        self.unit_of_work = unit_of_work
        self.policy = policy

    def create(self, data: UserCreate) -> User:
        self.policy.ensure_email_available(data.email)

        user = User(
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
        )
        with self.unit_of_work.transaction():
            self.user_repo.add(user)
        self.unit_of_work.refresh(user)
        return user

    def list(self) -> list[User]:
        return self.user_repo.list()

    def get(self, user_id: int) -> User:
        return self.policy.get_existing_user(user_id)

    def update(self, user_id: int, data: UserUpdate) -> User:
        user = self.policy.get_existing_user(user_id)
        self.policy.ensure_email_available(data.email, current_user_id=user_id)

        password_hash = hash_password(data.password) if data.password is not None else None
        fields = {
            "name": data.name,
            "email": data.email,
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
