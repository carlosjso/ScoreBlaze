from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, DateTime, ForeignKey, func

from database.alchemy import Base


class MatchPlayerParticipation(Base):
    __tablename__ = "match_player_participations"
    __table_args__ = (
        CheckConstraint(
            "NOT (played = true AND present = false)",
            name="ck_match_player_participations_played_requires_present",
        ),
    )

    match_id = Column(
        BigInteger,
        ForeignKey("matches.id", ondelete="CASCADE"),
        primary_key=True,
    )
    team_id = Column(
        BigInteger,
        ForeignKey("teams.id", ondelete="CASCADE"),
        primary_key=True,
    )
    player_id = Column(
        BigInteger,
        ForeignKey("players.id", ondelete="CASCADE"),
        primary_key=True,
    )
    present = Column(Boolean, nullable=False, default=False, server_default="false")
    played = Column(Boolean, nullable=False, default=False, server_default="false")
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            "MatchPlayerParticipation("
            f"match_id={self.match_id}, team_id={self.team_id}, player_id={self.player_id}, "
            f"present={self.present}, played={self.played}"
            ")"
        )
