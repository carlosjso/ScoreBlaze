from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from data.orm import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, user: User) -> User:
        self.db.add(user)
        return user

    def update(self, user: User, **fields) -> User:
        for key, value in fields.items():
            setattr(user, key, value)
        self.db.flush()
        return user

    def get(self, user_id: int) -> Optional[User]:
        statement = (
            select(User)
            .options(selectinload(User.roles))
            .where(
                User.id == user_id,
                User.deleted_at.is_(None),
            )
        )
        return self.db.scalar(statement)

    def list(self) -> list[User]:
        statement = (
            select(User)
            .options(selectinload(User.roles))
            .where(User.deleted_at.is_(None))
            .order_by(User.id.asc())
        )
        return list(self.db.scalars(statement).all())

    def get_by_email(self, email: str, include_deleted: bool = False) -> Optional[User]:
        statement = select(User).options(selectinload(User.roles)).where(User.email == email)
        if not include_deleted:
            statement = statement.where(User.deleted_at.is_(None))
        return self.db.scalar(statement)

    def soft_delete(self, user: User) -> None:
        user.deleted_at = datetime.now(timezone.utc)
