from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

USER_NAME_MAX_LENGTH = 250
USER_PASSWORD_MIN_LENGTH = 8
USER_PASSWORD_MAX_LENGTH = 128


class UserBase(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=USER_NAME_MAX_LENGTH
    )

    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(
        ...,
        min_length=USER_PASSWORD_MIN_LENGTH,
        max_length=USER_PASSWORD_MAX_LENGTH
    )


class UserUpdate(UserBase):
    password: Optional[str] = Field(
        default=None,
        min_length=USER_PASSWORD_MIN_LENGTH,
        max_length=USER_PASSWORD_MAX_LENGTH
    )


class UserOut(UserBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)