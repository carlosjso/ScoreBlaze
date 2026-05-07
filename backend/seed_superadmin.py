"""Create or update the default superadmin account."""

from __future__ import annotations

from sqlalchemy.orm import Session

import config
from data.orm import User
from database.alchemy import SessionLocal
from modules.users.repositories import RoleRepository, UserRepository
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


def run() -> None:
    db: Session = SessionLocal()
    try:
        user_repo = UserRepository(db)
        role_repo = RoleRepository(db)

        existing_user = _get_existing_seed_user(user_repo)
        roles = [role_repo.get_or_create(role_name) for role_name in config.SEED_SUPERADMIN_ROLES]
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

        db.commit()
        db.refresh(user)

        action = "created" if created else "updated"
        role_names = ", ".join(role.name for role in user.roles)
        print(f"Superadmin {action}: {user.email}")
        print(f"Roles: {role_names}")
        print(f"Password: {config.SEED_SUPERADMIN_PASSWORD}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
