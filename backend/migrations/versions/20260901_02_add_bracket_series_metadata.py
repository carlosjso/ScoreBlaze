"""add bracket series metadata to matches"""

from alembic import op
import sqlalchemy as sa


revision = "20260901_02"
down_revision = "20260901_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("bracket_game", sa.Integer(), nullable=True))
    op.add_column("matches", sa.Column("bracket_series_mode", sa.String(length=20), nullable=True))
    op.add_column("matches", sa.Column("bracket_series_best_of", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("matches", "bracket_series_best_of")
    op.drop_column("matches", "bracket_series_mode")
    op.drop_column("matches", "bracket_game")
