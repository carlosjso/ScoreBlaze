from sqlalchemy import BigInteger, Column, ForeignKey, String, Table
from sqlalchemy.orm import relationship

from database.alchemy import Base

user_roles_table = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(Base):
    __tablename__ = "roles"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)

    users = relationship("User", secondary=user_roles_table, back_populates="roles")

    def __repr__(self) -> str:  # pragma: no cover
        return f"Role(id={self.id}, name={self.name})"
