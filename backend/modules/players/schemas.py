from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

PLAYER_NAME_MAX_LENGTH = 50
PLAYER_EMAIL_MAX_LENGTH = 120


class PlayerBase(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=PLAYER_NAME_MAX_LENGTH
    )

    email: EmailStr

    phone: Optional[str] = Field(
        default=None,
        pattern=r"^[0-9]{10}$"
    )

    @field_validator("phone", mode="before")
    @classmethod
    def normalize_phone(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, int):
            return str(value)
        return value


class PlayerCreate(PlayerBase):
    photo_base64: Optional[str] = Field(
        default=None,
        description="Optional player photo encoded in Base64."
    )

    team_ids: list[int] = Field(default_factory=list)


class PlayerUpdate(PlayerBase):
    photo_base64: Optional[str] = Field(
        ...,
        description="Optional player photo encoded in Base64."
    )

    team_ids: list[int]


class PlayerOut(PlayerBase):
    id: int

    photo_base64: Optional[str] = Field(
        default=None,
        description="Optional player photo encoded in Base64."
    )

    model_config = ConfigDict(from_attributes=True)


class PlayerTableTeamOut(BaseModel):
    id: int
    name: str
    logo_base64: Optional[str] = None


class PlayerTableRowOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    photo_base64: Optional[str] = Field(
        default=None,
        description="Optional player photo encoded in Base64."
    )
    team_ids: list[int]
    team_names: list[str]
    teams: list[PlayerTableTeamOut]
    team_label: str
    teams_count: int
    status: Literal["Con equipo", "Sin equipo"]


class PaginatedPlayersTableOut(BaseModel):
    items: list[PlayerTableRowOut]
    page: int
    page_size: int
    total_items: int
    total_pages: int
