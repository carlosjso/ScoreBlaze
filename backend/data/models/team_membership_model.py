from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TeamMembershipCreate(BaseModel):
    player_id: int
    team_id: int
    shirt_number: Optional[str] = Field(default=None, max_length=20)


class TeamMembershipUpdate(BaseModel):
    shirt_number: Optional[str] = Field(default=None, max_length=20)


class TeamMembershipOut(BaseModel):
    player_id: int
    team_id: int
    shirt_number: Optional[str]

    model_config = ConfigDict(from_attributes=True)
