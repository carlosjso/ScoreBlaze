from typing import Annotated, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

PLAYER_NAME_MAX_LENGTH = 100
PLAYER_EMAIL_MAX_LENGTH = 120
PLAYER_PHONE_MAX_VALUE = 9_223_372_036_854_775_807


class PlayerBase(BaseModel):
    name: str = Field(..., max_length=PLAYER_NAME_MAX_LENGTH)
    email: Annotated[EmailStr, Field(max_length=PLAYER_EMAIL_MAX_LENGTH)]
    phone: Optional[int] = Field(default=None, ge=0, le=PLAYER_PHONE_MAX_VALUE)


class PlayerCreate(PlayerBase):
    photo_base64: Optional[str] = Field(default=None, description="Optional player photo encoded in Base64.")
    team_ids: list[int] = Field(default_factory=list)


class PlayerUpdate(PlayerBase):
    photo_base64: Optional[str] = Field(..., description="Optional player photo encoded in Base64.")
    team_ids: list[int]


class PlayerOut(PlayerBase):
    id: int
    photo_base64: Optional[str] = Field(default=None, description="Optional player photo encoded in Base64.")

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
    photo_base64: Optional[str] = Field(default=None, description="Optional player photo encoded in Base64.")
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
