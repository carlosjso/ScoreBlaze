from __future__ import annotations

from core.exceptions import ConflictException, UnauthorizedException
from database.unit_of_work import UnitOfWork
from modules.players.repositories import PlayerRepository
from modules.users.repositories import RoleRepository, UserRepository
from utils.jwt_tokens import decode_jwt
from utils.media import decode_base64_payload
from utils.security import hash_password

from .schemas import AccountInvitationCompletion, AccountInvitationOut
from .tokens import ACCOUNT_INVITATION_PURPOSE


class AccountInvitationService:
    PLAYER_ROLE_NAME = "jugador"

    def __init__(
        self,
        user_repo: UserRepository,
        role_repo: RoleRepository,
        player_repo: PlayerRepository,
        unit_of_work: UnitOfWork,
    ):
        self.user_repo = user_repo
        self.role_repo = role_repo
        self.player_repo = player_repo
        self.unit_of_work = unit_of_work

    @staticmethod
    def _decode_photo(photo_base64: str | None) -> bytes | None:
        return decode_base64_payload(photo_base64, "Invalid photo. Could not decode Base64")

    def _decode_token(self, token: str) -> dict:
        payload = decode_jwt(token)
        if payload.get("purpose") != ACCOUNT_INVITATION_PURPOSE:
            raise UnauthorizedException("Token invalido.")

        user_id = payload.get("user_id")
        email = payload.get("email")
        role = payload.get("role")
        if not isinstance(user_id, int) or not isinstance(email, str) or not isinstance(role, str):
            raise UnauthorizedException("Token invalido.")

        return payload

    def validate(self, token: str) -> AccountInvitationOut:
        payload = self._decode_token(token)
        user = self.user_repo.get(payload["user_id"])
        email = payload["email"].strip().lower()
        role = payload["role"].strip().lower()

        if user is None or user.email.strip().lower() != email:
            raise UnauthorizedException("Token invalido.")

        if getattr(user, "account_status", "active") == "active" and user.password_hash:
            raise ConflictException("La invitacion ya fue utilizada.")

        player_id = payload.get("player_id")
        if player_id is not None and not isinstance(player_id, int):
            raise UnauthorizedException("Token invalido.")

        team_id = payload.get("team_id")
        if team_id is not None and not isinstance(team_id, int):
            raise UnauthorizedException("Token invalido.")

        return AccountInvitationOut(
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=role,
            player_id=player_id,
            team_id=team_id,
            requires_player_profile=role == self.PLAYER_ROLE_NAME and player_id is not None,
        )

    def complete(self, data: AccountInvitationCompletion) -> AccountInvitationOut:
        invitation = self.validate(data.token)
        user = self.user_repo.get(invitation.user_id)
        if user is None:
            raise UnauthorizedException("Token invalido.")

        role = self.role_repo.get_or_create(invitation.role)

        with self.unit_of_work.transaction():
            if invitation.requires_player_profile:
                player = self.player_repo.get(invitation.player_id or 0)
                if player is None or player.email.strip().lower() != user.email.strip().lower():
                    raise UnauthorizedException("Token invalido.")

                self.player_repo.update(
                    player,
                    phone=data.phone,
                    age=data.age,
                    height_cm=data.height_cm,
                    weight_kg=data.weight_kg,
                    nationality=data.nationality,
                    favorite_position=data.favorite_position,
                    photo=self._decode_photo(data.photo_base64),
                )

            self.user_repo.update(
                user,
                password_hash=hash_password(data.password),
                account_status="active",
                deleted_at=None,
            )
            if role not in user.roles:
                user.roles = [*user.roles, role]

        self.unit_of_work.refresh(user)
        return AccountInvitationOut(
            user_id=user.id,
            name=user.name,
            email=user.email,
            role=invitation.role,
            player_id=invitation.player_id,
            team_id=invitation.team_id,
            requires_player_profile=invitation.requires_player_profile,
        )
