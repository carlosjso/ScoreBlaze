"""add bracket path to matches"""

from alembic import op
import sqlalchemy as sa


revision = "20260908_02"
down_revision = "20260908_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("bracket_path", sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column("matches", "bracket_path")
