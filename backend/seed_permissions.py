"""Create the base permission catalog used by role-permission matrix."""

from __future__ import annotations

from sqlalchemy.orm import Session

from data.orm import Permission
from database.alchemy import SessionLocal
from modules.users.permission_catalog import get_catalog_permission_names
from modules.users.repositories import PermissionRepository


def run() -> None:
    db: Session = SessionLocal()
    try:
        permission_repo = PermissionRepository(db)
        existing_permissions = {permission.name for permission in permission_repo.list()}
        permission_names = sorted(get_catalog_permission_names())

        created_names: list[str] = []
        for permission_name in permission_names:
            if permission_name in existing_permissions:
                continue

            permission_repo.add(Permission(name=permission_name))
            created_names.append(permission_name)

        db.commit()

        print(f"Permissions total: {len(permission_names)}")
        print(f"Permissions created: {len(created_names)}")
        if created_names:
            print("Created:")
            for permission_name in created_names:
                print(f"- {permission_name}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
