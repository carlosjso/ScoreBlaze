from __future__ import annotations

from math import ceil

from core.exceptions import ConflictException, ForbiddenException, NotFoundException, ValidationException
from data.orm import Role
from database.unit_of_work import UnitOfWork

from .repositories import RoleRepository
from .schemas import RoleCreate, RoleTableItem, RoleTablePageOut, RoleOut, RoleUpdate

SYSTEM_ROLE_NAMES = {"admin", "coach"}


class RoleService:
    def __init__(self, role_repo: RoleRepository, unit_of_work: UnitOfWork):
        self.role_repo = role_repo
        self.unit_of_work = unit_of_work

    def _normalize_name(self, value: str) -> str:
        normalized_name = value.strip().lower()
        if not normalized_name:
            raise ValidationException("El nombre del rol es obligatorio.")
        return normalized_name

    def _is_system_role(self, role_name: str) -> bool:
        return role_name.strip().lower() in SYSTEM_ROLE_NAMES

    def _serialize_role(self, role: Role, *, user_count: int | None = None) -> RoleOut:
        next_user_count = user_count if user_count is not None else self.role_repo.count_active_users(role.id)
        return RoleOut(
            id=role.id,
            name=role.name,
            user_count=next_user_count,
            is_system=self._is_system_role(role.name),
        )

    def _get_existing_role(self, role_id: int) -> Role:
        role = self.role_repo.get(role_id)
        if role is None:
            raise NotFoundException("Rol no encontrado.")
        return role

    def list(self) -> list[RoleOut]:
        return [self._serialize_role(role) for role in self.role_repo.list()]

    def get(self, role_id: int) -> RoleOut:
        return self._serialize_role(self._get_existing_role(role_id))

    def get_table_page(
        self,
        *,
        page: int,
        page_size: int,
        search: str,
        sort_key: str,
        sort_dir: str,
    ) -> RoleTablePageOut:
        normalized_page = max(1, page)
        normalized_page_size = max(1, page_size)
        items_raw, total_items = self.role_repo.get_table_page(
            page=normalized_page,
            page_size=normalized_page_size,
            search=search,
            sort_key=sort_key,
            sort_dir=sort_dir,
        )
        total_pages = max(1, ceil(total_items / normalized_page_size))
        items = [
            RoleTableItem(
                id=item["id"],
                name=item["name"],
                user_count=item["user_count"],
                is_system=self._is_system_role(str(item["name"])),
            )
            for item in items_raw
        ]
        return RoleTablePageOut(
            items=items,
            page=min(normalized_page, total_pages),
            page_size=normalized_page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

    def create(self, payload: RoleCreate) -> RoleOut:
        normalized_name = self._normalize_name(payload.name)
        if self.role_repo.get_by_name(normalized_name) is not None:
            raise ConflictException("Ya existe un rol con ese nombre.")

        role = Role(name=normalized_name)
        with self.unit_of_work.transaction():
            self.role_repo.add(role)
        self.unit_of_work.refresh(role)
        return self._serialize_role(role, user_count=0)

    def update(self, role_id: int, payload: RoleUpdate) -> RoleOut:
        role = self._get_existing_role(role_id)
        if self._is_system_role(role.name):
            raise ForbiddenException("No se puede editar un rol del sistema.")

        normalized_name = self._normalize_name(payload.name)
        existing_role = self.role_repo.get_by_name(normalized_name)
        if existing_role is not None and existing_role.id != role.id:
            raise ConflictException("Ya existe un rol con ese nombre.")

        with self.unit_of_work.transaction():
            self.role_repo.update(role, name=normalized_name)
        self.unit_of_work.refresh(role)
        return self._serialize_role(role)

    def delete(self, role_id: int) -> None:
        role = self._get_existing_role(role_id)
        if self._is_system_role(role.name):
            raise ForbiddenException("No se puede eliminar un rol del sistema.")

        user_count = self.role_repo.count_active_users(role.id)
        if user_count > 0:
            raise ConflictException("No se puede eliminar un rol asignado a usuarios.")

        with self.unit_of_work.transaction():
            self.role_repo.delete(role)
