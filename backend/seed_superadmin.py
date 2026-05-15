"""Create or update the default superadmin account."""

from __future__ import annotations

from sqlalchemy.orm import Session

import config
from data.orm import Permission, User
from database.alchemy import SessionLocal
from modules.users.permission_catalog import get_catalog_permission_names
from modules.users.repositories import PermissionRepository, RoleRepository, UserRepository
from utils.security import hash_password

LEGACY_SUPERADMIN_EMAILS = (
    "superadmin@scoreblaze.local",
    "superadmin@scoreblaze.com",
)


def _get_existing_seed_user(user_repo: UserRepository) -> User | None:
    configured_user = user_repo.get_by_email(config.SEED_SUPERADMIN_EMAIL, include_deleted=True)
    if configured_user is not None:
        return configured_user

    for legacy_email in LEGACY_SUPERADMIN_EMAILS:
        if legacy_email == config.SEED_SUPERADMIN_EMAIL:
            continue

        legacy_user = user_repo.get_by_email(legacy_email, include_deleted=True)
        if legacy_user is not None:
            return legacy_user

    return None


def _sync_catalog_permissions(permission_repo: PermissionRepository) -> dict[str, Permission]:
    permissions_by_name = {permission.name: permission for permission in permission_repo.list()}
    missing_names = sorted(get_catalog_permission_names().difference(permissions_by_name))

    for permission_name in missing_names:
        permission = Permission(name=permission_name)
        permission_repo.add(permission)
        permissions_by_name[permission_name] = permission

    return permissions_by_name


def run() -> None:
    db: Session = SessionLocal()
    try:
        user_repo = UserRepository(db)
        role_repo = RoleRepository(db)
        permission_repo = PermissionRepository(db)

        existing_user = _get_existing_seed_user(user_repo)
        roles = [role_repo.get_or_create(role_name) for role_name in config.SEED_SUPERADMIN_ROLES]
        permissions_by_name = _sync_catalog_permissions(permission_repo)
        password_hash = hash_password(config.SEED_SUPERADMIN_PASSWORD)
        created = existing_user is None

        if existing_user is None:
            user = User(
                name=config.SEED_SUPERADMIN_NAME,
                email=config.SEED_SUPERADMIN_EMAIL,
                password_hash=password_hash,
            )
            db.add(user)
        else:
            user = existing_user
            user.name = config.SEED_SUPERADMIN_NAME
            user.email = config.SEED_SUPERADMIN_EMAIL
            user.password_hash = password_hash
            user.deleted_at = None

        user.roles = roles
        for role in roles:
            if role.name == "superadmin":
                role.permissions = list(permissions_by_name.values())

        db.commit()
        db.refresh(user)

        action = "created" if created else "updated"
        role_names = ", ".join(role.name for role in user.roles)
        permission_count = sum(len(role.permissions) for role in user.roles if role.name == "superadmin")
        print(f"Superadmin {action}: {user.email}")
        print(f"Roles: {role_names}")
        print(f"Permissions: {permission_count}")
        print(f"Password: {config.SEED_SUPERADMIN_PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
