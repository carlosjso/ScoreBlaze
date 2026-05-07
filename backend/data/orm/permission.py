from sqlalchemy import BigInteger, Column, ForeignKey, String, Table
from sqlalchemy.orm import relationship

from database.alchemy import Base

role_permissions_table = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", BigInteger, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", BigInteger, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(BigInteger, primary_key=True, autoincrement=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)

    roles = relationship(
        "Role",
        secondary=role_permissions_table,
        back_populates="permissions",
        lazy="selectin",
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"Permission(id={self.id}, name={self.name})"
