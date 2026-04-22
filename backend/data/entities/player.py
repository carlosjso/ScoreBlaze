from sqlalchemy import BigInteger, Column, String
from sqlalchemy.orm import relationship

from database.alchemy import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(250), nullable=False)
    email = Column(String(250), nullable=False, unique=True, index=True)
    phone = Column(BigInteger, nullable=True)

    team_memberships = relationship(
        "TeamMembership",
        back_populates="player",
        cascade="all, delete-orphan",
    )
    stats = relationship(
        "PlayerStat",
        back_populates="player",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"Player(id={self.id}, name={self.name})"
