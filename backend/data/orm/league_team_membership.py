from sqlalchemy import BigInteger, CheckConstraint, Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from database.alchemy import Base


class LeagueTeamMembership(Base):
    __tablename__ = "league_team_memberships"
    __table_args__ = (
        CheckConstraint("sort_order >= 1", name="ck_league_team_memberships_sort_order"),
        UniqueConstraint("league_id", "sort_order", name="ux_league_team_memberships_league_sort_order"),
    )

    league_id = Column(
        BigInteger,
        ForeignKey("leagues.id", ondelete="CASCADE"),
        primary_key=True,
    )
    team_id = Column(
        BigInteger,
        ForeignKey("teams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    sort_order = Column(Integer, nullable=False, default=1, server_default="1")

    league = relationship("League", back_populates="team_memberships")
    team = relationship("Team", back_populates="league_memberships")

    def __repr__(self) -> str:  # pragma: no cover
        return f"LeagueTeamMembership(league_id={self.league_id}, team_id={self.team_id}, sort_order={self.sort_order})"
