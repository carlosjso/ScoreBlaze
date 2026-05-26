"""add pending user accounts
"""

from alembic import op
import sqlalchemy as sa

revision = "20260524_01"
down_revision = "20260519_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("account_status", sa.String(length=30), nullable=False, server_default="active"),
    )
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    op.execute("UPDATE users SET password_hash = '' WHERE password_hash IS NULL")
    op.alter_column(
        "users",
        "password_hash",
        existing_type=sa.String(length=255),
        nullable=False,
    )
    op.drop_column("users", "account_status")
