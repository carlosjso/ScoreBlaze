"""add optional player profile fields"""

from alembic import op
import sqlalchemy as sa

revision = "20260514_01"
down_revision = "20260513_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("players", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("players", sa.Column("height_cm", sa.Integer(), nullable=True))
    op.add_column("players", sa.Column("weight_kg", sa.Integer(), nullable=True))
    op.add_column("players", sa.Column("nationality", sa.String(length=80), nullable=True))
    op.add_column("players", sa.Column("favorite_position", sa.String(length=60), nullable=True))


def downgrade() -> None:
    op.drop_column("players", "favorite_position")
    op.drop_column("players", "nationality")
    op.drop_column("players", "weight_kg")
    op.drop_column("players", "height_cm")
    op.drop_column("players", "age")
