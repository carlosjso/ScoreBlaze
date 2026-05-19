from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import relationship

from database.alchemy import Base


class LeagueStat(Base):
    __tablename__ = "league_stats"

    league_id = Column(
        BigInteger,
        ForeignKey("leagues.id", ondelete="CASCADE"),
        primary_key=True,
    )
    stats_payload = Column(JSON, nullable=False, default=dict)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )

    league = relationship("League", back_populates="stat_snapshot")

    def __repr__(self) -> str:  # pragma: no cover
        return f"LeagueStat(league_id={self.league_id})"
