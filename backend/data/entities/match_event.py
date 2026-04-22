from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from database.alchemy import Base


class MatchEvent(Base):
    __tablename__ = "match_events"
    __table_args__ = (
        CheckConstraint("period >= 0", name="ck_match_events_period"),
        CheckConstraint("elapsed_seconds >= 0", name="ck_match_events_elapsed_seconds"),
        CheckConstraint("event_order >= 0", name="ck_match_events_event_order"),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    match_id = Column(
        BigInteger,
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team_id = Column(
        BigInteger,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    player_id = Column(
        BigInteger,
        ForeignKey("players.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    guest_name = Column(String(250), nullable=True)
    event_type = Column(String(30), nullable=False)
    period = Column(Integer, nullable=False)
    elapsed_seconds = Column(Integer, nullable=False)
    event_order = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    match = relationship("Match")
    team = relationship("Team")
    player = relationship("Player")

    def __repr__(self) -> str:  # pragma: no cover
        return f"MatchEvent(id={self.id}, match_id={self.match_id}, event_type={self.event_type})"
