from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.entities import User


class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, entity: User) -> User:
        self.db.add(entity)
        return entity

    def get(self, user_id: int) -> Optional[User]:
        stmt = select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
        return self.db.scalar(stmt)

    def list(self) -> list[User]:
        stmt = select(User).where(User.deleted_at.is_(None)).order_by(User.id.asc())
        return list(self.db.scalars(stmt).all())

    def get_by_email(self, email: str, include_deleted: bool = False) -> Optional[User]:
        stmt = select(User).where(User.email == email)
        if not include_deleted:
            stmt = stmt.where(User.deleted_at.is_(None))
        return self.db.scalar(stmt)

    def soft_delete(self, user: User) -> None:
        user.deleted_at = datetime.now(timezone.utc)
