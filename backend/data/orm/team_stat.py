from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from database.alchemy import Base


class TeamStat(Base):
    __tablename__ = "team_stats"
    __table_args__ = (
        CheckConstraint("matches_played >= 0", name="ck_team_stats_matches_played"),
        CheckConstraint("wins >= 0", name="ck_team_stats_wins"),
        CheckConstraint("losses >= 0", name="ck_team_stats_losses"),
        CheckConstraint("draws >= 0", name="ck_team_stats_draws"),
        CheckConstraint("points_for >= 0", name="ck_team_stats_points_for"),
        CheckConstraint("points_against >= 0", name="ck_team_stats_points_against"),
        CheckConstraint("standings_points >= 0", name="ck_team_stats_standings_points"),
        CheckConstraint("total_team_fouls >= 0", name="ck_team_stats_total_team_fouls"),
    )

    team_id = Column(
        BigInteger,
        ForeignKey("teams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    matches_played = Column(Integer, nullable=False, default=0, server_default="0")
    wins = Column(Integer, nullable=False, default=0, server_default="0")
    losses = Column(Integer, nullable=False, default=0, server_default="0")
    draws = Column(Integer, nullable=False, default=0, server_default="0")
    points_for = Column(Integer, nullable=False, default=0, server_default="0")
    points_against = Column(Integer, nullable=False, default=0, server_default="0")
    points_difference = Column(Integer, nullable=False, default=0, server_default="0")
    standings_points = Column(Integer, nullable=False, default=0, server_default="0")
    total_team_fouls = Column(Integer, nullable=False, default=0, server_default="0")
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )

    team = relationship("Team", back_populates="stats")

    def __repr__(self) -> str:  # pragma: no cover
        return f"TeamStat(team_id={self.team_id})"
