from sqlalchemy import BigInteger, Column, DateTime, String, func
from sqlalchemy.orm import relationship

from database.alchemy import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(250), nullable=False)
    email = Column(String(250), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)
    account_status = Column(String(30), nullable=False, server_default="active")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    roles = relationship(
        "Role",
        secondary="user_roles",
        back_populates="users",
        lazy="selectin",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"User(id={self.id}, email={self.email})"
