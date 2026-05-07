from __future__ import annotations

from typing import Optional

from sqlalchemy import and_, asc, delete, desc, func, select
from sqlalchemy.orm import Session

from data.orm import Role, User, user_roles_table


class RoleRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, role: Role) -> Role:
        self.db.add(role)
        return role

    def update(self, role: Role, **fields) -> Role:
        for key, value in fields.items():
            setattr(role, key, value)
        self.db.flush()
        return role

    def delete(self, role: Role) -> None:
        self.db.delete(role)
        self.db.flush()

    def get(self, role_id: int) -> Optional[Role]:
        statement = select(Role).where(Role.id == role_id)
        return self.db.scalar(statement)

    def list(self) -> list[Role]:
        statement = select(Role).order_by(Role.id.asc())
        return list(self.db.scalars(statement).all())

    def get_by_name(self, name: str) -> Optional[Role]:
        statement = select(Role).where(Role.name == name)
        return self.db.scalar(statement)

    def get_or_create(self, name: str) -> Role:
        normalized_name = name.strip().lower()
        existing_role = self.get_by_name(normalized_name)
        if existing_role is not None:
            return existing_role

        role = Role(name=normalized_name)
        self.add(role)
        self.db.flush()
        return role

    def count_active_users(self, role_id: int) -> int:
        statement = (
            select(func.count(func.distinct(User.id)))
            .select_from(user_roles_table)
            .join(
                User,
                and_(
                    User.id == user_roles_table.c.user_id,
                    User.deleted_at.is_(None),
                ),
            )
            .where(user_roles_table.c.role_id == role_id)
        )
        return int(self.db.scalar(statement) or 0)

    def get_table_page(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        sort_key: str,
        sort_dir: str,
    ) -> tuple[list[dict[str, int | str]], int]:
        normalized_search = search.strip().lower()
        user_count_expr = func.count(func.distinct(User.id)).label("user_count")

        statement = (
            select(Role.id, Role.name, user_count_expr)
            .select_from(Role)
            .outerjoin(user_roles_table, user_roles_table.c.role_id == Role.id)
            .outerjoin(
                User,
                and_(
                    User.id == user_roles_table.c.user_id,
                    User.deleted_at.is_(None),
                ),
            )
        )

        total_statement = select(func.count()).select_from(Role)

        if normalized_search:
            search_clause = func.lower(Role.name).contains(normalized_search)
            statement = statement.where(search_clause)
            total_statement = total_statement.where(search_clause)

        statement = statement.group_by(Role.id, Role.name)

        sortable_columns = {
            "id": Role.id,
            "name": Role.name,
            "users": user_count_expr,
        }
        sort_column = sortable_columns.get(sort_key, Role.name)
        order_fn = desc if sort_dir == "desc" else asc
        statement = statement.order_by(order_fn(sort_column), asc(Role.id))

        offset = max(0, (page - 1) * page_size)
        rows = self.db.execute(statement.offset(offset).limit(page_size)).all()
        total_items = int(self.db.scalar(total_statement) or 0)

        items = [
            {
                "id": int(row.id),
                "name": str(row.name),
                "user_count": int(row.user_count or 0),
            }
            for row in rows
        ]
        return items, total_items
