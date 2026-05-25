"""Create or update the default superadmin account."""

from __future__ import annotations

from sqlalchemy.orm import Session

from database.alchemy import SessionLocal
from modules.users.repositories import PermissionRepository, RoleRepository, UserRepository
from seed_support import build_default_seed_users, sync_permissions_and_roles, upsert_user


def run() -> None:
    db: Session = SessionLocal()
    try:
        user_repo = UserRepository(db)
        role_repo = RoleRepository(db)
        permission_repo = PermissionRepository(db)
        permissions_by_name = sync_permissions_and_roles(permission_repo, role_repo)
        admin_seed = build_default_seed_users()[0]
        user, created = upsert_user(
            user_repo=user_repo,
            role_repo=role_repo,
            permissions_by_name=permissions_by_name,
            seed_user=admin_seed,
        )
        db.commit()
        db.refresh(user)

        action = "created" if created else "updated"
        role_names = ", ".join(role.name for role in user.roles)
        permission_count = sum(len(role.permissions) for role in user.roles if role.name == "superadmin")
        print(f"Superadmin {action}: {user.email}")
        print(f"Roles: {role_names}")
        print(f"Permissions: {permission_count}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
