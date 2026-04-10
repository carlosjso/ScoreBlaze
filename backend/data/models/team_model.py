from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TeamBase(BaseModel):
    name: str = Field(..., max_length=250)


class TeamCreate(TeamBase):
    logo_base64: Optional[str] = Field(
        default=None,
        description="Optional logo encoded in Base64.",
    )
    player_ids: list[int] = Field(default_factory=list)


class TeamUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=250)
    logo_base64: Optional[str] = Field(default=None, description="Optional logo encoded in Base64.")
    player_ids: Optional[list[int]] = None


class TeamOut(TeamBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
