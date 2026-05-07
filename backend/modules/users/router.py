from fastapi import APIRouter, Depends, status

from .dependencies import get_role_service, get_user_service
from .role_service import RoleService
from .schemas import RoleCreate, RoleOut, RoleTablePageOut, RoleUpdate, UserCreate, UserOut, UserUpdate
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


@router.get("/", response_model=list[UserOut], status_code=status.HTTP_200_OK)
def list_users(service: UserService = Depends(get_user_service)):
    return service.list()


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, service: UserService = Depends(get_user_service)):
    return service.create(payload)


@router.get("/{user_id}", response_model=UserOut, status_code=status.HTTP_200_OK)
def get_user(user_id: int, service: UserService = Depends(get_user_service)):
    return service.get(user_id)


@router.put("/{user_id}", response_model=UserOut, status_code=status.HTTP_200_OK)
def update_user(
    user_id: int,
    payload: UserUpdate,
    service: UserService = Depends(get_user_service),
):
    return service.update(user_id, payload)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, service: UserService = Depends(get_user_service)):
    service.delete(user_id)
