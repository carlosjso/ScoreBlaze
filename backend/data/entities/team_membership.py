from sqlalchemy import BigInteger, Column, ForeignKey, String
from sqlalchemy.orm import relationship

from database.alchemy import Base


class TeamMembership(Base):
    __tablename__ = "team_memberships"

    player_id = Column(
        BigInteger,
        ForeignKey("players.id", ondelete="CASCADE"),
        primary_key=True,
    )
    team_id = Column(
        BigInteger,
        ForeignKey("teams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    shirt_number = Column(String(20), nullable=True)

    team = relationship("Team", back_populates="team_memberships")
    player = relationship("Player", back_populates="team_memberships")

    def __repr__(self) -> str:  # pragma: no cover
        return (
            "TeamMembership("
            f"player_id={self.player_id}, team_id={self.team_id}, shirt_number={self.shirt_number}"
            ")"
        )
