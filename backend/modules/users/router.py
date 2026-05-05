from fastapi import APIRouter, Depends, status

from .dependencies import get_user_service
from .schemas import UserCreate, UserOut, UserUpdate
from .service import UserService

router = APIRouter()


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
