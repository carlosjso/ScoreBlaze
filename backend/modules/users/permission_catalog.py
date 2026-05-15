from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PermissionActionDefinition:
    key: str
    label: str


@dataclass(frozen=True)
class PermissionModuleDefinition:
    key: str
    label: str
    description: str
    actions: tuple[PermissionActionDefinition, ...]


ROLE_PERMISSION_CATALOG: tuple[PermissionModuleDefinition, ...] = (
    PermissionModuleDefinition(
        key="dashboard",
        label="Dashboard",
        description="Accesos principales del tablero inicial.",
        actions=(
            PermissionActionDefinition("view", "Ver"),
        ),
    ),
    PermissionModuleDefinition(
        key="players",
        label="Jugadores",
        description="Control de jugadores, altas y actualizaciones.",
        actions=(
            PermissionActionDefinition("view", "Ver"),
            PermissionActionDefinition("create", "Crear"),
            PermissionActionDefinition("edit", "Editar"),
            PermissionActionDefinition("assign_team", "Asignar equipo"),
            PermissionActionDefinition("delete", "Eliminar"),
        ),
    ),
    PermissionModuleDefinition(
        key="teams",
        label="Equipos",
        description="Administracion de equipos y su plantilla.",
        actions=(
            PermissionActionDefinition("view", "Ver"),
            PermissionActionDefinition("create", "Crear"),
            PermissionActionDefinition("edit", "Editar"),
            PermissionActionDefinition("manage_roster", "Plantilla"),
            PermissionActionDefinition("delete", "Eliminar"),
        ),
    ),
    PermissionModuleDefinition(
        key="quick_match",
        label="Partido rapido",
        description="Creacion, consulta y gestion del partido rapido.",
        actions=(
            PermissionActionDefinition("view", "Ver"),
            PermissionActionDefinition("create", "Crear"),
            PermissionActionDefinition("edit", "Editar"),
            PermissionActionDefinition("view_stats", "Estadisticas"),
            PermissionActionDefinition("delete", "Eliminar"),
        ),
    ),
    PermissionModuleDefinition(
        key="leagues",
        label="Ligas",
        description="Configuracion y seguimiento de ligas.",
        actions=(
            PermissionActionDefinition("view", "Ver"),
            PermissionActionDefinition("create", "Crear"),
            PermissionActionDefinition("edit", "Editar"),
            PermissionActionDefinition("delete", "Eliminar"),
        ),
    ),
    PermissionModuleDefinition(
        key="roles",
        label="Roles",
        description="Administracion del catalogo de roles.",
        actions=(
            PermissionActionDefinition("view", "Ver"),
            PermissionActionDefinition("create", "Crear"),
            PermissionActionDefinition("edit", "Editar"),
            PermissionActionDefinition("delete", "Eliminar"),
        ),
    ),
    PermissionModuleDefinition(
        key="permissions",
        label="Permisos",
        description="Control del catalogo de permisos.",
        actions=(
            PermissionActionDefinition("view", "Ver"),
            PermissionActionDefinition("create", "Crear"),
            PermissionActionDefinition("edit", "Editar"),
            PermissionActionDefinition("delete", "Eliminar"),
        ),
    ),
    PermissionModuleDefinition(
        key="users",
        label="Usuarios",
        description="Altas y administracion de usuarios.",
        actions=(
            PermissionActionDefinition("view", "Ver"),
            PermissionActionDefinition("create", "Crear"),
            PermissionActionDefinition("edit", "Editar"),
            PermissionActionDefinition("delete", "Eliminar"),
        ),
    ),
)


def build_permission_name(module_key: str, action_key: str) -> str:
    return f"{module_key}.{action_key}"


def get_catalog_permission_names() -> set[str]:
    return {
        build_permission_name(module.key, action.key)
        for module in ROLE_PERMISSION_CATALOG
        for action in module.actions
    }
