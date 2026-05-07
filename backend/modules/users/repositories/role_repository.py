from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from data.orm import Role


class RoleRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, role: Role) -> Role:
        self.db.add(role)
        return role

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
