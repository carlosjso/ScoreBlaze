from fastapi import APIRouter, Depends, Query, status

from .dependencies import get_account_invitation_service
from .schemas import AccountInvitationCompletion, AccountInvitationOut
from .service import AccountInvitationService

router = APIRouter()


@router.get("/validate", response_model=AccountInvitationOut, status_code=status.HTTP_200_OK)
def validate_account_invitation(
    token: str = Query(..., min_length=1),
    service: AccountInvitationService = Depends(get_account_invitation_service),
):
    return service.validate(token)


@router.post("/complete", response_model=AccountInvitationOut, status_code=status.HTTP_200_OK)
def complete_account_invitation(
    payload: AccountInvitationCompletion,
    service: AccountInvitationService = Depends(get_account_invitation_service),
):
    return service.complete(payload)
