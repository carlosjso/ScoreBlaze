"""Create or update the default superadmin account."""

from __future__ import annotations

from sqlalchemy.orm import Session

import config
from data.orm import User
from database.alchemy import SessionLocal
from modules.users.repositories import RoleRepository, UserRepository
from utils.security import hash_password


def run() -> None:
    db: Session = SessionLocal()
    try:
        user_repo = UserRepository(db)
        role_repo = RoleRepository(db)

        existing_user = user_repo.get_by_email(config.SEED_SUPERADMIN_EMAIL, include_deleted=True)
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
