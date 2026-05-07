from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

TEAM_NAME_MAX_LENGTH = 50
RESPONSIBLE_NAME_MAX_LENGTH = 100
RESPONSIBLE_PHONE_MAX_LENGTH = 19
RESPONSIBLE_EMAIL_MAX_LENGTH = 120


class TeamBase(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=TEAM_NAME_MAX_LENGTH
    )


class TeamContactFields(BaseModel):
    responsible_name: str = Field(
        ...,
        min_length=1,
        max_length=RESPONSIBLE_NAME_MAX_LENGTH
    )

    responsible_phone: str = Field(
        ...,
        min_length=1,
        max_length=RESPONSIBLE_PHONE_MAX_LENGTH
    )

    responsible_email: EmailStr


class TeamCreate(TeamBase, TeamContactFields):
    logo_base64: Optional[str] = Field(
        default=None,
        description="Optional logo encoded in Base64.",
    )

    player_ids: list[int] = Field(default_factory=list)


class TeamUpdate(TeamBase, TeamContactFields):
    logo_base64: Optional[str] = Field(
        ...,
        description="Optional logo encoded in Base64."
    )

    player_ids: list[int]


class TeamOut(TeamBase):
    id: int

    responsible_name: Optional[str] = Field(
        default=None,
        max_length=RESPONSIBLE_NAME_MAX_LENGTH
    )

    responsible_phone: Optional[str] = Field(
        default=None,
        max_length=RESPONSIBLE_PHONE_MAX_LENGTH
    )

    responsible_email: Optional[EmailStr] = None

    logo_base64: Optional[str] = Field(
        default=None,
        description="Optional logo encoded in Base64."
    )

    model_config = ConfigDict(from_attributes=True)


class TeamTablePlayerOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    photo_base64: Optional[str] = None


class TeamTableRowOut(BaseModel):
    id: int
    name: str
    responsible_name: str
    responsible_phone: str
    responsible_email: str

    logo_base64: Optional[str] = Field(
        default=None,
        description="Optional logo encoded in Base64."
    )

    player_ids: list[int]
    player_count: int
    players: list[TeamTablePlayerOut]
    players_label: str
    roster_status: Literal["Con jugadores", "Sin jugadores"]


class PaginatedTeamsTableOut(BaseModel):
    items: list[TeamTableRowOut]
    page: int
    page_size: int
    total_items: int
    total_pages: int