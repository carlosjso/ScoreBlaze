from __future__ import annotations

from typing import Optional

from sqlalchemy import asc, desc, func, select
from sqlalchemy.orm import Session

from data.orm import Permission, Role, role_permissions_table


class PermissionRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, permission: Permission) -> Permission:
        self.db.add(permission)
        return permission

    def update(self, permission: Permission, **fields) -> Permission:
        for key, value in fields.items():
            setattr(permission, key, value)
        self.db.flush()
        return permission

    def delete(self, permission: Permission) -> None:
        self.db.delete(permission)
        self.db.flush()

    def get(self, permission_id: int) -> Optional[Permission]:
        statement = select(Permission).where(Permission.id == permission_id)
        return self.db.scalar(statement)

    def list(self) -> list[Permission]:
        statement = select(Permission).order_by(Permission.id.asc())
        return list(self.db.scalars(statement).all())

    def get_by_name(self, name: str) -> Optional[Permission]:
        statement = select(Permission).where(Permission.name == name)
        return self.db.scalar(statement)

    def count_assigned_roles(self, permission_id: int) -> int:
        statement = (
            select(func.count(func.distinct(Role.id)))
            .select_from(role_permissions_table)
            .join(Role, Role.id == role_permissions_table.c.role_id)
            .where(role_permissions_table.c.permission_id == permission_id)
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
        role_count_expr = func.count(func.distinct(Role.id)).label("role_count")

        statement = (
            select(Permission.id, Permission.name, role_count_expr)
            .select_from(Permission)
            .outerjoin(role_permissions_table, role_permissions_table.c.permission_id == Permission.id)
            .outerjoin(Role, Role.id == role_permissions_table.c.role_id)
        )
        total_statement = select(func.count()).select_from(Permission)

        if normalized_search:
            search_clause = func.lower(Permission.name).contains(normalized_search)
            statement = statement.where(search_clause)
            total_statement = total_statement.where(search_clause)

        statement = statement.group_by(Permission.id, Permission.name)

        sortable_columns = {
            "id": Permission.id,
            "name": Permission.name,
            "roles": role_count_expr,
        }
        sort_column = sortable_columns.get(sort_key, Permission.name)
        order_fn = desc if sort_dir == "desc" else asc
        statement = statement.order_by(order_fn(sort_column), asc(Permission.id))

        offset = max(0, (page - 1) * page_size)
        rows = self.db.execute(statement.offset(offset).limit(page_size)).all()
        total_items = int(self.db.scalar(total_statement) or 0)

        items = [
            {
                "id": int(row.id),
                "name": str(row.name),
                "role_count": int(row.role_count or 0),
            }
            for row in rows
        ]
        return items, total_items
