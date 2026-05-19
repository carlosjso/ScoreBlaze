from __future__ import annotations

from core.exceptions import ForbiddenException, NotFoundException, ValidationException
from data.orm import Permission, Role
from database.unit_of_work import UnitOfWork

from .permission_catalog import ROLE_PERMISSION_CATALOG, build_permission_name, get_catalog_permission_names
from .repositories import PermissionRepository, RoleRepository
from .role_service import SYSTEM_ROLE_NAMES
from .schemas import (
    RoleOut,
    RolePermissionActionOut,
    RolePermissionMatrixOut,
    RolePermissionMatrixUpdate,
    RolePermissionModuleOut,
)


class RolePermissionService:
    def __init__(
        self,
        role_repo: RoleRepository,
        permission_repo: PermissionRepository,
        unit_of_work: UnitOfWork,
    ):
        self.role_repo = role_repo
        self.permission_repo = permission_repo
        self.unit_of_work = unit_of_work

    def _get_existing_role(self, role_id: int) -> Role:
        role = self.role_repo.get(role_id)
        if role is None:
            raise NotFoundException("Rol no encontrado.")
        return role

    def _is_system_role(self, role_name: str) -> bool:
        return role_name.strip().lower() in SYSTEM_ROLE_NAMES

    def _serialize_role(self, role: Role) -> RoleOut:
        return RoleOut(
            id=role.id,
            name=role.name,
            user_count=self.role_repo.count_active_users(role.id),
            is_system=self._is_system_role(role.name),
        )

    def _normalize_permission_names(self, permission_names: list[str]) -> list[str]:
        normalized_names: list[str] = []
        seen_names: set[str] = set()

        for raw_name in permission_names:
            normalized_name = raw_name.strip().lower()
            if not normalized_name or normalized_name in seen_names:
                continue
            seen_names.add(normalized_name)
            normalized_names.append(normalized_name)

        return normalized_names

    def _sync_catalog_permissions(self) -> dict[str, Permission]:
        permissions_by_name = {permission.name: permission for permission in self.permission_repo.list()}
        missing_names = sorted(get_catalog_permission_names().difference(permissions_by_name))

        if missing_names:
            for permission_name in missing_names:
                permission = Permission(name=permission_name)
                self.permission_repo.add(permission)
                permissions_by_name[permission_name] = permission
            self.unit_of_work.flush()

        return permissions_by_name

    def _build_matrix(self, role: Role) -> RolePermissionMatrixOut:
        enabled_permission_names = {permission.name for permission in role.permissions}
        modules: list[RolePermissionModuleOut] = []

        for module in ROLE_PERMISSION_CATALOG:
            actions = [
                RolePermissionActionOut(
                    key=action.key,
                    label=action.label,
                    permission_name=build_permission_name(module.key, action.key),
                    enabled=build_permission_name(module.key, action.key) in enabled_permission_names,
                )
                for action in module.actions
            ]
            modules.append(
                RolePermissionModuleOut(
                    key=module.key,
                    label=module.label,
                    description=module.description,
                    allow_all=all(action.enabled for action in actions),
                    permissions=actions,
                )
            )

        return RolePermissionMatrixOut(
            role=self._serialize_role(role),
            modules=modules,
        )

    def get_matrix(self, role_id: int) -> RolePermissionMatrixOut:
        with self.unit_of_work.transaction():
            self._sync_catalog_permissions()
            role = self._get_existing_role(role_id)

        return self._build_matrix(role)

    def update_matrix(self, role_id: int, payload: RolePermissionMatrixUpdate) -> RolePermissionMatrixOut:
        catalog_permission_names = get_catalog_permission_names()
        normalized_permission_names = self._normalize_permission_names(payload.permission_names)
        invalid_permission_names = sorted(
            permission_name
            for permission_name in normalized_permission_names
            if permission_name not in catalog_permission_names
        )
        if invalid_permission_names:
            raise ValidationException("Se recibieron permisos no validos.")

        with self.unit_of_work.transaction():
            permissions_by_name = self._sync_catalog_permissions()
            role = self._get_existing_role(role_id)
            if self._is_system_role(role.name):
                raise ForbiddenException("No se puede editar un rol del sistema.")

            preserved_permissions = [
                permission
                for permission in role.permissions
                if permission.name not in catalog_permission_names
            ]
            selected_permissions = [
                permissions_by_name[permission_name]
                for permission_name in normalized_permission_names
            ]
            role.permissions = preserved_permissions + selected_permissions
            self.unit_of_work.flush()

        self.unit_of_work.refresh(role)
        return self._build_matrix(role)
