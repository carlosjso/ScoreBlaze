from __future__ import annotations

from data.entities import User
from data.models import UserCreate, UserUpdate
from repositories import UserRepository
from utils.security import hash_password


class UserService:
    def __init__(self, user_repo: UserRepository):
        self.user_repo = user_repo

    @property
    def db(self):
        return self.user_repo.db

    def create(self, data: UserCreate) -> User:
        if self.user_repo.get_by_email(data.email, include_deleted=True):
            raise ValueError("Email already exists")

        user = User(
            name=data.name,
            email=data.email,
            password_hash=hash_password(data.password),
        )
        self.user_repo.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def list(self) -> list[User]:
        return self.user_repo.list()

    def get(self, user_id: int) -> User | None:
        return self.user_repo.get(user_id)

    def update(self, user_id: int, data: UserUpdate) -> User:
        user = self.user_repo.get(user_id)
        if not user:
            raise LookupError("User not found")

        changes = data.model_dump(exclude_unset=True)
        if "email" in changes:
            existing = self.user_repo.get_by_email(changes["email"], include_deleted=True)
            if existing and existing.id != user_id:
                raise ValueError("Email already exists")

        password = changes.pop("password", None)
        if password is not None:
            user.password_hash = hash_password(password)

        for key, value in changes.items():
            setattr(user, key, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    def delete(self, user_id: int) -> None:
        user = self.user_repo.get(user_id)
        if not user:
            raise LookupError("User not found")

        self.user_repo.soft_delete(user)
        self.db.commit()
