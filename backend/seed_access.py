"""Seed access essentials: permissions, admin and optional demo users."""

from sqlalchemy.orm import Session

from database.alchemy import SessionLocal
from modules.users.default_role_permissions import sync_default_permissions_for_existing_roles
from modules.users.repositories import PermissionRepository, RoleRepository, UserRepository
from seed_support import build_default_seed_users, sync_permissions_and_roles, upsert_user


def run() -> None:
    db: Session = SessionLocal()
    try:
        permission_repo = PermissionRepository(db)
        role_repo = RoleRepository(db)
        user_repo = UserRepository(db)

        permissions_by_name = sync_permissions_and_roles(permission_repo, role_repo)
        synced_default_roles = sync_default_permissions_for_existing_roles(
            role_repo=role_repo,
            permission_repo=permission_repo,
        )
        seeded_users: list[str] = []

        for seed_user in build_default_seed_users():
            user, created = upsert_user(
                user_repo=user_repo,
                role_repo=role_repo,
                permissions_by_name=permissions_by_name,
                seed_user=seed_user,
            )
            action = "created" if created else "updated"
            seeded_users.append(f"{seed_user.label}:{user.email}:{action}")

        db.commit()

        print("Access seed completed.")
        print(f"Permissions total: {len(permissions_by_name)}")
        print("Users:")
        for seeded_user in seeded_users:
            print(f"- {seeded_user}")
        if synced_default_roles:
            print("Default role permissions synced:")
            for role_name in synced_default_roles:
                print(f"- {role_name}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
