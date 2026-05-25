from __future__ import annotations

from collections.abc import Iterable

from data.orm import Permission, Role

from .permission_catalog import get_catalog_permission_names
from .repositories import PermissionRepository, RoleRepository

COACH_ROLE_NAME = "coach"
PLAYER_ROLE_NAME = "jugador"

DEFAULT_ROLE_PERMISSION_NAMES: dict[str, set[str]] = {
    COACH_ROLE_NAME: {
        "dashboard.view",
        "players.view",
        "players.create",
        "players.edit",
        "players.assign_team",
        "teams.view",
        "teams.create",
        "teams.edit",
        "teams.manage_roster",
        "quick_match.view",
        "quick_match.create",
        "quick_match.edit",
        "quick_match.view_stats",
        "leagues.view",
        "leagues.create",
        "leagues.edit",
    },
    PLAYER_ROLE_NAME: {
        "dashboard.view",
        "players.view",
        "teams.view",
        "quick_match.view",
        "quick_match.view_stats",
        "leagues.view",
    },
}


def get_default_permission_names_for_role(role_name: str) -> set[str]:
    normalized_role_name = role_name.strip().lower()
    return set(DEFAULT_ROLE_PERMISSION_NAMES.get(normalized_role_name, set()))


def ensure_catalog_permissions(permission_repo: PermissionRepository) -> dict[str, Permission]:
    permissions_by_name = {permission.name: permission for permission in permission_repo.list()}
    missing_names = sorted(get_catalog_permission_names().difference(permissions_by_name))

    for permission_name in missing_names:
        permission = Permission(name=permission_name)
        permission_repo.add(permission)
        permissions_by_name[permission_name] = permission

    return permissions_by_name


def apply_default_permissions_to_role(
    role: Role,
    permissions_by_name: dict[str, Permission],
) -> bool:
    default_permission_names = get_default_permission_names_for_role(role.name)
    if not default_permission_names:
        return False

    selected_permissions = [
        permissions_by_name[permission_name]
        for permission_name in sorted(default_permission_names)
        if permission_name in permissions_by_name
    ]
    existing_permission_names = {permission.name for permission in role.permissions}
    missing_permission_names = {permission.name for permission in selected_permissions} - existing_permission_names
    if not missing_permission_names:
        return False

    preserved_permissions = [
        permission
        for permission in role.permissions
        if permission.name not in missing_permission_names
    ]
    role.permissions = preserved_permissions + selected_permissions
    return True


def sync_default_permissions_for_existing_roles(
    *,
    role_repo: RoleRepository,
    permission_repo: PermissionRepository,
    target_role_names: Iterable[str] | None = None,
) -> list[str]:
    permissions_by_name = ensure_catalog_permissions(permission_repo)
    normalized_targets = (
        {role_name.strip().lower() for role_name in target_role_names if role_name.strip()}
        if target_role_names is not None
        else set(DEFAULT_ROLE_PERMISSION_NAMES)
    )

    updated_role_names: list[str] = []
    for role_name in sorted(normalized_targets):
        role = role_repo.get_by_name(role_name)
        if role is None:
            continue
        if apply_default_permissions_to_role(role, permissions_by_name):
            updated_role_names.append(role.name)

    return updated_role_names
