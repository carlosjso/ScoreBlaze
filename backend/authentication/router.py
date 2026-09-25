from fastapi import APIRouter, Depends, Request, Response, status

from core.exceptions import ForbiddenException

from .dependencies import (
    clear_auth_session_cookie,
    get_auth_service,
    get_session_id_from_request,
    require_authenticated_user,
    set_auth_session_cookie,
)
from .schemas import AuthLoginRequest, AuthMessageOut, AuthRegisterRequest, AuthSessionOut, AuthUserOut
from .service import AuthService

router = APIRouter()


@router.post("/login", response_model=AuthSessionOut, status_code=status.HTTP_200_OK)
async def login(
    response: Response,
    payload: AuthLoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    auth_session, session = await auth_service.login(payload)
    set_auth_session_cookie(response, session.session_id)
    return auth_session


@router.post("/register", response_model=AuthSessionOut, status_code=status.HTTP_201_CREATED)
async def register(
    response: Response,
    payload: AuthRegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    raise ForbiddenException("El registro publico esta deshabilitado. Solicita una invitacion para acceder.")


@router.get("/me", response_model=AuthSessionOut, status_code=status.HTTP_200_OK)
async def get_current_session(
    current_user: AuthUserOut = Depends(require_authenticated_user),
):
    return AuthSessionOut(user=current_user)


@router.post("/touch", response_model=AuthSessionOut, status_code=status.HTTP_200_OK)
async def touch_session(
    current_user: AuthUserOut = Depends(require_authenticated_user),
):
    return AuthSessionOut(user=current_user)


@router.post("/logout", response_model=AuthMessageOut, status_code=status.HTTP_200_OK)
async def logout(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
):
    session_id = get_session_id_from_request(request)
    if session_id:
        await auth_service.logout(session_id)

    clear_auth_session_cookie(response)
    return AuthMessageOut(message="Sesión cerrada.")
