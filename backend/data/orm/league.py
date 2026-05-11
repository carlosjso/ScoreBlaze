import base64

from sqlalchemy import BigInteger, CheckConstraint, Column, Date, JSON, LargeBinary, String
from sqlalchemy.orm import relationship

from database.alchemy import Base


class League(Base):
    __tablename__ = "leagues"
    __table_args__ = (
        CheckConstraint("length(name) > 0", name="ck_leagues_name_not_empty"),
        CheckConstraint("length(category) > 0", name="ck_leagues_category_not_empty"),
        CheckConstraint("start_date <= end_date", name="ck_leagues_schedule"),
        CheckConstraint(
            "status IN ('Sin empezar', 'En curso', 'Finalizada')",
            name="ck_leagues_status",
        ),
    )

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(80), nullable=False, unique=True, index=True)
    responsible_name = Column(String(100), nullable=False)
    responsible_email = Column(String(120), nullable=False)
    category = Column(String(80), nullable=False)
    status = Column(String(20), nullable=False, default="Sin empezar", server_default="Sin empezar", index=True)
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    logo = Column(LargeBinary, nullable=True)
    tracked_stats = Column(JSON, nullable=False, default=list)

    team_memberships = relationship(
        "LeagueTeamMembership",
        back_populates="league",
        cascade="all, delete-orphan",
        order_by="LeagueTeamMembership.sort_order",
    )
    matches = relationship("Match", back_populates="league")
    stat_snapshot = relationship(
        "LeagueStat",
        back_populates="league",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def logo_base64(self) -> str | None:
        if self.logo is None:
            return None
        return base64.b64encode(self.logo).decode("utf-8")

    @property
    def team_ids(self) -> list[int]:
        return [membership.team_id for membership in self.team_memberships]

    def __repr__(self) -> str:  # pragma: no cover
        return f"League(id={self.id}, name={self.name})"
