import base64

from sqlalchemy import BigInteger, Column, LargeBinary, String
from sqlalchemy.orm import relationship

from database.alchemy import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(250), nullable=False, unique=True)
    logo = Column(LargeBinary, nullable=True)

    team_memberships = relationship(
        "TeamMembership",
        back_populates="team",
        cascade="all, delete-orphan",
    )
    stats = relationship(
        "TeamStat",
        back_populates="team",
        uselist=False,
        cascade="all, delete-orphan",
    )

    @property
    def logo_base64(self) -> str | None:
        if self.logo is None:
            return None
        return base64.b64encode(self.logo).decode("utf-8")

    def __repr__(self) -> str:  # pragma: no cover
        return f"Team(id={self.id}, name={self.name})"
