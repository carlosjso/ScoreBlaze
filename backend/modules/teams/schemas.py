from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

TEAM_NAME_MAX_LENGTH = 80
RESPONSIBLE_NAME_MAX_LENGTH = 100
RESPONSIBLE_PHONE_MAX_LENGTH = 19
RESPONSIBLE_EMAIL_MAX_LENGTH = 120


class TeamBase(BaseModel):
    name: str = Field(..., max_length=TEAM_NAME_MAX_LENGTH)


class TeamContactFields(BaseModel):
    responsible_name: str = Field(..., max_length=RESPONSIBLE_NAME_MAX_LENGTH)
    responsible_phone: str = Field(..., max_length=RESPONSIBLE_PHONE_MAX_LENGTH)
    responsible_email: str = Field(..., max_length=RESPONSIBLE_EMAIL_MAX_LENGTH)


class TeamCreate(TeamBase, TeamContactFields):
    logo_base64: Optional[str] = Field(
        default=None,
        description="Optional logo encoded in Base64.",
    )
    player_ids: list[int] = Field(default_factory=list)


class TeamUpdate(TeamBase, TeamContactFields):
    logo_base64: Optional[str] = Field(..., description="Optional logo encoded in Base64.")
    player_ids: list[int]


class TeamOut(TeamBase):
    id: int
    responsible_name: Optional[str] = Field(default=None, max_length=RESPONSIBLE_NAME_MAX_LENGTH)
    responsible_phone: Optional[str] = Field(default=None, max_length=RESPONSIBLE_PHONE_MAX_LENGTH)
    responsible_email: Optional[str] = Field(default=None, max_length=RESPONSIBLE_EMAIL_MAX_LENGTH)
    logo_base64: Optional[str] = Field(default=None, description="Optional logo encoded in Base64.")

    model_config = ConfigDict(from_attributes=True)
