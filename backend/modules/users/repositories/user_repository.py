from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import asc, desc, func, or_, select
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

    def get_table_page(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        sort_key: str,
        sort_dir: str,
    ) -> tuple[list[User], int]:
        normalized_search = search.strip().lower()

        statement = (
            select(User)
            .options(selectinload(User.roles))
            .where(User.deleted_at.is_(None))
        )
        total_statement = select(func.count()).select_from(User).where(User.deleted_at.is_(None))

        if normalized_search:
            search_clause = or_(
                func.lower(User.name).contains(normalized_search),
                func.lower(User.email).contains(normalized_search),
            )
            statement = statement.where(search_clause)
            total_statement = total_statement.where(search_clause)

        sortable_columns = {
            "id": User.id,
            "name": func.lower(User.name),
            "email": func.lower(User.email),
        }
        sort_column = sortable_columns.get(sort_key, func.lower(User.name))
        order_fn = desc if sort_dir == "desc" else asc
        statement = statement.order_by(order_fn(sort_column), asc(User.id))

        offset = max(0, (page - 1) * page_size)
        rows = list(self.db.scalars(statement.offset(offset).limit(page_size)).all())
        total_items = int(self.db.scalar(total_statement) or 0)
        return rows, total_items

    def get_by_email(self, email: str, include_deleted: bool = False) -> Optional[User]:
        statement = select(User).options(selectinload(User.roles)).where(User.email == email)
        if not include_deleted:
            statement = statement.where(User.deleted_at.is_(None))
        return self.db.scalar(statement)

    def soft_delete(self, user: User) -> None:
        user.deleted_at = datetime.now(timezone.utc)
