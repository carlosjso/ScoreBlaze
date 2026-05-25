"""Create the base permission catalog used by role-permission matrix."""

from __future__ import annotations

from sqlalchemy.orm import Session

from data.orm import Permission
from database.alchemy import SessionLocal
from modules.users.permission_catalog import get_catalog_permission_names
from modules.users.repositories import PermissionRepository, RoleRepository


DEFAULT_ROLE_PERMISSIONS: dict[str, set[str]] = {
    "coach": {
        "dashboard.view",
        "teams.view",
        "teams.create",
        "teams.edit",
        "teams.manage_roster",
        "players.view",
        "players.create",
        "players.assign_team",
        "quick_match.view",
        "quick_match.create",
        "quick_match.edit",
        "quick_match.view_stats",
        "leagues.view",
    },
    "jugador": {
        "dashboard.view",
        "teams.view",
        "players.view",
        "quick_match.view",
        "quick_match.view_stats",
        "leagues.view",
    },
}


def run() -> None:
    db: Session = SessionLocal()
    try:
        permission_repo = PermissionRepository(db)
        role_repo = RoleRepository(db)
        existing_permissions = {permission.name for permission in permission_repo.list()}
        permission_names = sorted(get_catalog_permission_names())

        created_names: list[str] = []
        for permission_name in permission_names:
            if permission_name in existing_permissions:
                continue

            permission_repo.add(Permission(name=permission_name))
            created_names.append(permission_name)

        db.flush()
        permissions_by_name = {permission.name: permission for permission in permission_repo.list()}
        synced_roles: list[str] = []
        for role_name, role_permission_names in DEFAULT_ROLE_PERMISSIONS.items():
            role = role_repo.get_or_create(role_name)
            current_permissions = {permission.name: permission for permission in role.permissions}
            next_permissions = {
                **current_permissions,
                **{
                    permission_name: permissions_by_name[permission_name]
                    for permission_name in role_permission_names
                    if permission_name in permissions_by_name
                },
            }
            role.permissions = [
                next_permissions[permission_name]
                for permission_name in sorted(role_permission_names)
                if permission_name in next_permissions
            ] + [
                permission
                for permission_name, permission in sorted(next_permissions.items())
                if permission_name not in role_permission_names
            ]
            synced_roles.append(role_name)

        db.commit()

        print(f"Permissions total: {len(permission_names)}")
        print(f"Permissions created: {len(created_names)}")
        print(f"Default roles synced: {', '.join(synced_roles)}")
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
