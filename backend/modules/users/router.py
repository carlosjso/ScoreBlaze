from fastapi import APIRouter, Depends, status

from .dependencies import get_permission_service, get_role_service, get_user_service
from .permission_service import PermissionService
from .role_service import RoleService
from .schemas import (
    PermissionCreate,
    PermissionOut,
    PermissionTablePageOut,
    PermissionUpdate,
    RoleCreate,
    RoleOut,
    RoleTablePageOut,
    RoleUpdate,
    UserCreate,
    UserOut,
    UserTablePageOut,
    UserUpdate,
)
from .service import UserService

router = APIRouter()


@router.get("/roles", response_model=list[RoleOut], status_code=status.HTTP_200_OK)
def list_roles(service: RoleService = Depends(get_role_service)):
    return service.list()


@router.get("/roles/table", response_model=RoleTablePageOut, status_code=status.HTTP_200_OK)
def list_roles_table(
    page: int = 1,
    page_size: int = 10,
    search: str = "",
    sort_key: str = "name",
    sort_dir: str = "asc",
    service: RoleService = Depends(get_role_service),
):
    return service.get_table_page(
        page=page,
        page_size=page_size,
        search=search,
        sort_key=sort_key,
        sort_dir=sort_dir,
    )


@router.post("/roles", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleCreate, service: RoleService = Depends(get_role_service)):
    return service.create(payload)


@router.get("/roles/{role_id}", response_model=RoleOut, status_code=status.HTTP_200_OK)
def get_role(role_id: int, service: RoleService = Depends(get_role_service)):
    return service.get(role_id)


@router.put("/roles/{role_id}", response_model=RoleOut, status_code=status.HTTP_200_OK)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    service: RoleService = Depends(get_role_service),
):
    return service.update(role_id, payload)


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(role_id: int, service: RoleService = Depends(get_role_service)):
    service.delete(role_id)


@router.get("/permissions", response_model=list[PermissionOut], status_code=status.HTTP_200_OK)
def list_permissions(service: PermissionService = Depends(get_permission_service)):
    return service.list()


@router.get("/permissions/table", response_model=PermissionTablePageOut, status_code=status.HTTP_200_OK)
def list_permissions_table(
    page: int = 1,
    page_size: int = 10,
    search: str = "",
    sort_key: str = "name",
    sort_dir: str = "asc",
    service: PermissionService = Depends(get_permission_service),
):
    return service.get_table_page(
        page=page,
        page_size=page_size,
        search=search,
        sort_key=sort_key,
        sort_dir=sort_dir,
    )


@router.post("/permissions", response_model=PermissionOut, status_code=status.HTTP_201_CREATED)
def create_permission(payload: PermissionCreate, service: PermissionService = Depends(get_permission_service)):
    return service.create(payload)


@router.get("/permissions/{permission_id}", response_model=PermissionOut, status_code=status.HTTP_200_OK)
def get_permission(permission_id: int, service: PermissionService = Depends(get_permission_service)):
    return service.get(permission_id)


@router.put("/permissions/{permission_id}", response_model=PermissionOut, status_code=status.HTTP_200_OK)
def update_permission(
    permission_id: int,
    payload: PermissionUpdate,
    service: PermissionService = Depends(get_permission_service),
):
    return service.update(permission_id, payload)


@router.delete("/permissions/{permission_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_permission(permission_id: int, service: PermissionService = Depends(get_permission_service)):
    service.delete(permission_id)


@router.get("/", response_model=list[UserOut], status_code=status.HTTP_200_OK)
def list_users(service: UserService = Depends(get_user_service)):
    return service.list_out()


@router.get("/table", response_model=UserTablePageOut, status_code=status.HTTP_200_OK)
def list_users_table(
    page: int = 1,
    page_size: int = 10,
    search: str = "",
    sort_key: str = "name",
    sort_dir: str = "asc",
    service: UserService = Depends(get_user_service),
):
    return service.get_table_page(
        page=page,
        page_size=page_size,
        search=search,
        sort_key=sort_key,
        sort_dir=sort_dir,
    )


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, service: UserService = Depends(get_user_service)):
    return service.create_out(payload)


@router.get("/{user_id}", response_model=UserOut, status_code=status.HTTP_200_OK)
def get_user(user_id: int, service: UserService = Depends(get_user_service)):
    return service.get_out(user_id)


@router.put("/{user_id}", response_model=UserOut, status_code=status.HTTP_200_OK)
def update_user(
    user_id: int,
    payload: UserUpdate,
    service: UserService = Depends(get_user_service),
):
    return service.update_out(user_id, payload)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, service: UserService = Depends(get_user_service)):
    service.delete(user_id)
