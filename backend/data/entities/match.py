from sqlalchemy import BigInteger, Boolean, Column, Date, ForeignKey, Integer, String, Time
from sqlalchemy.orm import relationship

from database.alchemy import Base


class Match(Base):
    __tablename__ = "matches"

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
