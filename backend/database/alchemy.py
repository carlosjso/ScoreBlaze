from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from config import DB_URL

if not DB_URL:
    raise RuntimeError("DB_URL is not configured. Set it in your environment file.")

engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def set_tenant_context(db: Session, tenant_id: int):
    """Ejemplo de contexto multi-tenant (paridad con proyecto de referencia)."""
    db.execute(
        text("SET app.current_tenant = :tenant_id"),
        {"tenant_id": tenant_id},
    )
