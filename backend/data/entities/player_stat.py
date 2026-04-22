from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from database.alchemy import Base


class PlayerStat(Base):
    __tablename__ = "player_stats"
    __table_args__ = (
        CheckConstraint("matches_played >= 0", name="ck_player_stats_matches_played"),
        CheckConstraint("total_points >= 0", name="ck_player_stats_total_points"),
        CheckConstraint("made_1pt >= 0", name="ck_player_stats_made_1pt"),
        CheckConstraint("made_2pt >= 0", name="ck_player_stats_made_2pt"),
        CheckConstraint("made_3pt >= 0", name="ck_player_stats_made_3pt"),
        CheckConstraint("missed_shots >= 0", name="ck_player_stats_missed_shots"),
        CheckConstraint("total_assists >= 0", name="ck_player_stats_total_assists"),
        CheckConstraint("total_rebounds >= 0", name="ck_player_stats_total_rebounds"),
        CheckConstraint("total_fouls >= 0", name="ck_player_stats_total_fouls"),
    )

    player_id = Column(
        BigInteger,
        ForeignKey("players.id", ondelete="CASCADE"),
        primary_key=True,
    )
    matches_played = Column(Integer, nullable=False, default=0, server_default="0")
    total_points = Column(Integer, nullable=False, default=0, server_default="0")
    made_1pt = Column(Integer, nullable=False, default=0, server_default="0")
    made_2pt = Column(Integer, nullable=False, default=0, server_default="0")
    made_3pt = Column(Integer, nullable=False, default=0, server_default="0")
    missed_shots = Column(Integer, nullable=False, default=0, server_default="0")
    total_assists = Column(Integer, nullable=False, default=0, server_default="0")
    total_rebounds = Column(Integer, nullable=False, default=0, server_default="0")
    total_fouls = Column(Integer, nullable=False, default=0, server_default="0")
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )

    player = relationship("Player", back_populates="stats")

    def __repr__(self) -> str:  # pragma: no cover
        return f"PlayerStat(player_id={self.player_id})"
