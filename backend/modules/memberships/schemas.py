from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TeamMembershipCreate(BaseModel):
    player_id: int
    team_id: int
    shirt_number: Optional[str] = Field(default=None, max_length=20)


class TeamMembershipUpdate(BaseModel):
    shirt_number: Optional[str] = Field(..., max_length=20)


class TeamShirtNumberAssignment(BaseModel):
    player_id: int
    shirt_number: str = Field(..., min_length=1, max_length=20)


class TeamShirtNumbersUpdate(BaseModel):
    assignments: list[TeamShirtNumberAssignment] = Field(..., min_length=1, max_length=100)


class TeamMembershipOut(BaseModel):
    player_id: int
    team_id: int
    shirt_number: str

    model_config = ConfigDict(from_attributes=True)
