from __future__ import annotations

from math import ceil

from core.exceptions import ConflictException, NotFoundException, ValidationException
from data.orm import Permission
from database.unit_of_work import UnitOfWork

from .repositories import PermissionRepository
from .schemas import PermissionCreate, PermissionOut, PermissionTableItem, PermissionTablePageOut, PermissionUpdate


class PermissionService:
    def __init__(self, permission_repo: PermissionRepository, unit_of_work: UnitOfWork):
        self.permission_repo = permission_repo
        self.unit_of_work = unit_of_work

    def _normalize_name(self, value: str) -> str:
        normalized_name = value.strip().lower()
        if not normalized_name:
            raise ValidationException("El nombre del permiso es obligatorio.")
        return normalized_name

    def _serialize_permission(self, permission: Permission, *, role_count: int | None = None) -> PermissionOut:
        next_role_count = (
            role_count if role_count is not None else self.permission_repo.count_assigned_roles(permission.id)
        )
        return PermissionOut(
            id=permission.id,
            name=permission.name,
            role_count=next_role_count,
        )

    def _get_existing_permission(self, permission_id: int) -> Permission:
        permission = self.permission_repo.get(permission_id)
        if permission is None:
            raise NotFoundException("Permiso no encontrado.")
        return permission

    def list(self) -> list[PermissionOut]:
        return [self._serialize_permission(permission) for permission in self.permission_repo.list()]

    def get(self, permission_id: int) -> PermissionOut:
        return self._serialize_permission(self._get_existing_permission(permission_id))

    def get_table_page(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        sort_key: str,
        sort_dir: str,
    ) -> PermissionTablePageOut:
        normalized_page = max(1, page)
        normalized_page_size = max(1, page_size)
        items_raw, total_items = self.permission_repo.get_table_page(
            page=normalized_page,
            page_size=normalized_page_size,
            search=search,
            sort_key=sort_key,
            sort_dir=sort_dir,
        )
        total_pages = max(1, ceil(total_items / normalized_page_size))
        items = [
            PermissionTableItem(
                id=item["id"],
                name=item["name"],
                role_count=item["role_count"],
            )
            for item in items_raw
        ]
        return PermissionTablePageOut(
            items=items,
            page=min(normalized_page, total_pages),
            page_size=normalized_page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

    def create(self, payload: PermissionCreate) -> PermissionOut:
        normalized_name = self._normalize_name(payload.name)
        if self.permission_repo.get_by_name(normalized_name) is not None:
            raise ConflictException("Ya existe un permiso con ese nombre.")

        permission = Permission(name=normalized_name)
        with self.unit_of_work.transaction():
            self.permission_repo.add(permission)
        self.unit_of_work.refresh(permission)
        return self._serialize_permission(permission, role_count=0)

    def update(self, permission_id: int, payload: PermissionUpdate) -> PermissionOut:
        permission = self._get_existing_permission(permission_id)
        normalized_name = self._normalize_name(payload.name)
        existing_permission = self.permission_repo.get_by_name(normalized_name)
        if existing_permission is not None and existing_permission.id != permission.id:
            raise ConflictException("Ya existe un permiso con ese nombre.")

        with self.unit_of_work.transaction():
            self.permission_repo.update(permission, name=normalized_name)
        self.unit_of_work.refresh(permission)
        return self._serialize_permission(permission)

    def delete(self, permission_id: int) -> None:
        permission = self._get_existing_permission(permission_id)
        role_count = self.permission_repo.count_assigned_roles(permission.id)
        if role_count > 0:
            raise ConflictException("No se puede eliminar un permiso asignado a roles.")

        with self.unit_of_work.transaction():
            self.permission_repo.delete(permission)
