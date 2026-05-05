from sqlalchemy import BigInteger, Column, DateTime, String, func

from database.alchemy import Base


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(250), nullable=False)
    email = Column(String(250), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, index=True)

    def __repr__(self) -> str:  # pragma: no cover
        return f"User(id={self.id}, email={self.email})"
