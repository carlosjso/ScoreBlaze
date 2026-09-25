"""add persisted state for single-elimination brackets"""

from alembic import op
import sqlalchemy as sa


revision = "20260901_01"
down_revision = "20260831_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("leagues", sa.Column("bracket_state", sa.JSON(), nullable=True))
    op.add_column("matches", sa.Column("bracket_round", sa.Integer(), nullable=True))
    op.add_column("matches", sa.Column("bracket_slot", sa.Integer(), nullable=True))
    op.add_column("matches", sa.Column("bracket_size", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("matches", "bracket_size")
    op.drop_column("matches", "bracket_slot")
    op.drop_column("matches", "bracket_round")
    op.drop_column("leagues", "bracket_state")
