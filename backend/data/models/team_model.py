from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TeamBase(BaseModel):
    name: str = Field(..., max_length=250)


class TeamContactFields(BaseModel):
    responsible_name: str = Field(..., max_length=250)
    responsible_phone: str = Field(..., max_length=30)
    responsible_email: str = Field(..., max_length=250)


class TeamCreate(TeamBase, TeamContactFields):
    logo_base64: Optional[str] = Field(
        default=None,
        description="Optional logo encoded in Base64.",
    )
    player_ids: list[int] = Field(default_factory=list)


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=250)
    responsible_name: Optional[str] = Field(default=None, max_length=250)
    responsible_phone: Optional[str] = Field(default=None, max_length=30)
    responsible_email: Optional[str] = Field(default=None, max_length=250)
    logo_base64: Optional[str] = Field(default=None, description="Optional logo encoded in Base64.")
    player_ids: Optional[list[int]] = None


class TeamOut(TeamBase):
    id: int
    responsible_name: Optional[str] = Field(default=None, max_length=250)
    responsible_phone: Optional[str] = Field(default=None, max_length=30)
    responsible_email: Optional[str] = Field(default=None, max_length=250)
    logo_base64: Optional[str] = Field(default=None, description="Optional logo encoded in Base64.")

    model_config = ConfigDict(from_attributes=True)
