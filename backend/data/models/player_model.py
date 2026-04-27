from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PlayerBase(BaseModel):
    name: str = Field(..., max_length=250)
    email: EmailStr
    phone: Optional[int] = Field(default=None, ge=0)


class PlayerCreate(PlayerBase):
    photo_base64: Optional[str] = Field(default=None, description="Optional player photo encoded in Base64.")
    team_ids: list[int] = Field(default_factory=list)


class PlayerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=250)
    email: Optional[EmailStr] = None
    phone: Optional[int] = Field(default=None, ge=0)
    photo_base64: Optional[str] = Field(default=None, description="Optional player photo encoded in Base64.")
    team_ids: Optional[list[int]] = None


class PlayerOut(PlayerBase):
    id: int
    photo_base64: Optional[str] = Field(default=None, description="Optional player photo encoded in Base64.")

    model_config = ConfigDict(from_attributes=True)
