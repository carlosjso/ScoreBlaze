from __future__ import annotations

import unittest
from types import SimpleNamespace

from modules.access_scope import TeamAccessScopeResolver
from modules.users.default_role_permissions import (
    get_default_permission_names_for_role,
    sync_default_roles_and_permissions,
)
from modules.users.permission_catalog import get_catalog_permission_names
from modules.users.role_names import DEFAULT_ROLE_NAMES


class _PermissionRepository:
    def __init__(self):
        self.items = []

    def list(self):
        return list(self.items)

    def add(self, permission):
        self.items.append(permission)
        return permission


class _RoleRepository:
    def __init__(self):
        self.items = {}

    def get_or_create(self, name):
        normalized_name = name.strip().lower()
        if normalized_name not in self.items:
            self.items[normalized_name] = SimpleNamespace(name=normalized_name, permissions=[])
        return self.items[normalized_name]


class DefaultRolePermissionsTests(unittest.TestCase):
    def test_default_profiles_are_created_with_permissions(self):
        permission_repo = _PermissionRepository()
        role_repo = _RoleRepository()

        synced_names = sync_default_roles_and_permissions(
            role_repo=role_repo,
            permission_repo=permission_repo,
        )

        self.assertEqual(tuple(synced_names), DEFAULT_ROLE_NAMES)
        self.assertEqual(set(role_repo.items), set(DEFAULT_ROLE_NAMES))
        self.assertTrue(all(role.permissions for role in role_repo.items.values()))

    def test_administrator_receives_the_complete_catalog(self):
        self.assertEqual(
            get_default_permission_names_for_role("administrador"),
            get_catalog_permission_names(),
        )

    def test_referee_can_manage_scoreboard_without_destructive_permissions(self):
        permissions = get_default_permission_names_for_role("arbitro")

        self.assertIn("quick_match.edit", permissions)
        self.assertNotIn("quick_match.create", permissions)
        self.assertNotIn("quick_match.delete", permissions)

    def test_administrator_and_legacy_admin_keep_global_scope(self):
        administrator = SimpleNamespace(roles=["administrador"])
        legacy_admin = SimpleNamespace(roles=["admin"])

        self.assertTrue(TeamAccessScopeResolver.has_global_scope(administrator))
        self.assertTrue(TeamAccessScopeResolver.has_global_scope(legacy_admin))

    def test_captain_uses_team_manager_scope(self):
        captain = SimpleNamespace(roles=["capitan"])

        self.assertTrue(TeamAccessScopeResolver.is_coach_scoped_user(captain))
        self.assertFalse(TeamAccessScopeResolver.is_player_scoped_user(captain))


if __name__ == "__main__":
    unittest.main()
