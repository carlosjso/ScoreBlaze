from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, Date, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship

from database.alchemy import Base


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        CheckConstraint("team_a_id <> team_b_id", name="ck_matches_distinct_teams"),
        CheckConstraint("start_time < end_time", name="ck_matches_schedule"),
        CheckConstraint("(score_team_a IS NULL OR score_team_a >= 0)", name="ck_matches_score_team_a"),
        CheckConstraint("(score_team_b IS NULL OR score_team_b >= 0)", name="ck_matches_score_team_b"),
        CheckConstraint(
            "status IN ('scheduled', 'live', 'finished')",
            name="ck_matches_status",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    match_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    team_a_id = Column(
        BigInteger,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team_b_id = Column(
        BigInteger,
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    score_team_a = Column(Integer, nullable=True)
    score_team_b = Column(Integer, nullable=True)
    winner_team_id = Column(
        BigInteger,
        ForeignKey("teams.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_draw = Column(Boolean, nullable=False, default=False, server_default="false")

    court = Column(String(250), nullable=True)
    tournament = Column(String(250), nullable=True)
    status = Column(String(20), nullable=False, default="scheduled", server_default="scheduled", index=True)

    team_a = relationship("Team", foreign_keys=[team_a_id])
    team_b = relationship("Team", foreign_keys=[team_b_id])
    winner_team = relationship("Team", foreign_keys=[winner_team_id])

    def __repr__(self) -> str:  # pragma: no cover
        return (
            "Match("
            f"id={self.id}, date={self.match_date}, "
            f"team_a_id={self.team_a_id}, team_b_id={self.team_b_id}"
            ")"
        )
