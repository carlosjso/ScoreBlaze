from sqlalchemy import BigInteger, CheckConstraint, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from database.alchemy import Base


class MatchEvent(Base):
    __tablename__ = "match_events"
    __table_args__ = (
        CheckConstraint(
            "((player_id IS NOT NULL AND guest_name IS NULL) OR (player_id IS NULL AND guest_name IS NOT NULL))",
            name="ck_match_events_actor",
        ),
        CheckConstraint(
            "event_type IN ('point_1', 'point_2', 'point_3', 'miss', 'foul', 'rebound', 'assist')",
            name="ck_match_events_event_type",
        ),
        CheckConstraint("status IN ('active', 'voided')", name="ck_match_events_status"),
        CheckConstraint("period >= 1", name="ck_match_events_period"),
        CheckConstraint("elapsed_seconds >= 0", name="ck_match_events_elapsed_seconds"),
        CheckConstraint("event_order >= 0", name="ck_match_events_event_order"),
        UniqueConstraint("match_id", "event_order", name="ux_match_events_match_event_order"),
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
    event_type = Column(String(30), nullable=False, index=True)
    period = Column(Integer, nullable=False)
    elapsed_seconds = Column(Integer, nullable=False)
    event_order = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="active", server_default="active", index=True)
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
