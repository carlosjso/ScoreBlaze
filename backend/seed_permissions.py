from sqlalchemy.orm import Session

from database.alchemy import SessionLocal
from modules.users.default_role_permissions import sync_default_roles_and_permissions
from modules.users.repositories import PermissionRepository, RoleRepository
from seed_support import sync_permissions_and_roles


def run() -> None:
    db: Session = SessionLocal()
    try:
        permission_repo = PermissionRepository(db)
        role_repo = RoleRepository(db)
        existing_names = {permission.name for permission in permission_repo.list()}
        permissions_by_name = sync_permissions_and_roles(permission_repo, role_repo)
        synced_default_roles = sync_default_roles_and_permissions(
            role_repo=role_repo,
            permission_repo=permission_repo,
        )
        db.commit()

        created_names = sorted(set(permissions_by_name).difference(existing_names))
        print(f"Permissions total: {len(permissions_by_name)}")
        print(f"Permissions created: {len(created_names)}")
        print(f"Default roles synced: {', '.join(synced_default_roles)}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
