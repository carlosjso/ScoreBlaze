from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class PlayerBase(BaseModel):
    name: str = Field(..., max_length=250)
    email: EmailStr
    phone: Optional[int] = Field(default=None, ge=0)


class PlayerCreate(PlayerBase):
    team_ids: list[int] = Field(default_factory=list)


class PlayerUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=250)
    email: Optional[EmailStr] = None
    phone: Optional[int] = Field(default=None, ge=0)
    team_ids: Optional[list[int]] = None


class PlayerOut(PlayerBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
