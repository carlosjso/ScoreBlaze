from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from modules.players.schemas import (
    PLAYER_FAVORITE_POSITION_MAX_LENGTH,
    PLAYER_NATIONALITY_MAX_LENGTH,
    PlayerBase,
)

ACCOUNT_PASSWORD_MIN_LENGTH = 8
ACCOUNT_PASSWORD_MAX_LENGTH = 128


class AccountInvitationOut(BaseModel):
    user_id: int
    name: str
    email: EmailStr
    role: str
    player_id: Optional[int] = None
    team_id: Optional[int] = None
    team_name: Optional[str] = None
    requires_player_profile: bool = False


class AccountInvitationCompletion(BaseModel):
    token: str = Field(..., min_length=1)
    password: str = Field(..., min_length=ACCOUNT_PASSWORD_MIN_LENGTH, max_length=ACCOUNT_PASSWORD_MAX_LENGTH)
    phone: Optional[str] = Field(default=None, pattern=r"^[0-9]{10}$")
    age: Optional[int] = Field(default=None, ge=1, le=99)
    height_cm: Optional[int] = Field(default=None, ge=80, le=260)
    weight_kg: Optional[int] = Field(default=None, ge=20, le=250)
    nationality: Optional[str] = Field(default=None, min_length=1, max_length=PLAYER_NATIONALITY_MAX_LENGTH)
    favorite_position: Optional[str] = Field(default=None, min_length=1, max_length=PLAYER_FAVORITE_POSITION_MAX_LENGTH)
    photo_base64: Optional[str] = Field(default=None)

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_completion_phone(cls, value: object) -> object:
        return PlayerBase.normalize_phone(value)

    @field_validator("age", "height_cm", "weight_kg", mode="before")
    @classmethod
    def normalize_completion_numbers(cls, value: object) -> object:
        return PlayerBase.normalize_optional_numbers(value)

    @field_validator("nationality", "favorite_position", mode="before")
    @classmethod
    def normalize_completion_text(cls, value: object) -> object:
        return PlayerBase.normalize_optional_text(value)
