import base64

from sqlalchemy import BigInteger, Column, Integer, LargeBinary, String
from sqlalchemy.orm import relationship

from database.alchemy import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), nullable=False, unique=True, index=True)
    phone = Column(BigInteger, nullable=True)
    age = Column(Integer, nullable=True)
    height_cm = Column(Integer, nullable=True)
    weight_kg = Column(Integer, nullable=True)
    nationality = Column(String(80), nullable=True)
    favorite_position = Column(String(60), nullable=True)
    photo = Column(LargeBinary, nullable=True)

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

    @property
    def photo_base64(self) -> str | None:
        if self.photo is None:
            return None
        return base64.b64encode(self.photo).decode("utf-8")

    def __repr__(self) -> str:  # pragma: no cover
        return f"Player(id={self.id}, name={self.name})"
