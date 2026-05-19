"""add tracked stats snapshot to matches"""

from alembic import op
import sqlalchemy as sa

revision = "20260514_02"
down_revision = "20260514_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "matches",
        sa.Column("tracked_stats", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
    )


def downgrade() -> None:
    op.drop_column("matches", "tracked_stats")
