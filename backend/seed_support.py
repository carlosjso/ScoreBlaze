from __future__ import annotations

from dataclasses import dataclass

import config
from data.orm import Permission, User
from modules.users.permission_catalog import get_catalog_permission_names
from modules.users.repositories import PermissionRepository, RoleRepository, UserRepository
from utils.security import hash_password


@dataclass(frozen=True)
class SeedUserConfig:
    label: str
    name: str
    email: str
    password: str
    roles: tuple[str, ...]
    grant_all_permissions: bool = False


def sync_permissions_and_roles(
    permission_repo: PermissionRepository,
    role_repo: RoleRepository,
) -> dict[str, Permission]:
    existing_permissions = {permission.name: permission for permission in permission_repo.list()}

    for permission_name in sorted(get_catalog_permission_names()):
        if permission_name in existing_permissions:
            continue

        permission = Permission(name=permission_name)
        permission_repo.add(permission)
        existing_permissions[permission_name] = permission

    return existing_permissions


def upsert_user(
    *,
    user_repo: UserRepository,
    role_repo: RoleRepository,
    permissions_by_name: dict[str, Permission],
    seed_user: SeedUserConfig,
) -> tuple[User, bool]:
    existing_user = user_repo.get_by_email(seed_user.email, include_deleted=True)
    created = existing_user is None
    password_hash = hash_password(seed_user.password)
    roles = [role_repo.get_or_create(role_name) for role_name in seed_user.roles]

    if existing_user is None:
        user = User(
            name=seed_user.name,
            email=seed_user.email,
            password_hash=password_hash,
            account_status="active",
        )
        user_repo.add(user)
    else:
        user = existing_user
        user.name = seed_user.name
        user.email = seed_user.email
        user.password_hash = password_hash
        user.account_status = "active"
        user.deleted_at = None

    user.roles = roles
    if seed_user.grant_all_permissions:
        all_permissions = list(permissions_by_name.values())
        for role in roles:
            role.permissions = all_permissions

    return user, created


def build_default_seed_users() -> list[SeedUserConfig]:
    return [
        SeedUserConfig(
            label="admin",
            name=config.SEED_SUPERADMIN_NAME,
            email=config.SEED_SUPERADMIN_EMAIL,
            password=config.SEED_SUPERADMIN_PASSWORD,
            roles=config.SEED_SUPERADMIN_ROLES,
            grant_all_permissions=True,
        )
    ]
