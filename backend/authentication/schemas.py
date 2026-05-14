from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class AuthRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=250)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)


class AuthUserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    roles: list[str]
    permissions: list[str] = Field(default_factory=list)
    created_at: datetime


class AuthSessionOut(BaseModel):
    user: AuthUserOut


class AuthMessageOut(BaseModel):
    message: str
