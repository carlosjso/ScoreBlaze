"""add optional sex to players"""

from alembic import op
import sqlalchemy as sa


revision = "20261007_01"
down_revision = "20261005_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("players", sa.Column("sex", sa.String(length=10), nullable=True))
    op.create_check_constraint(
        "ck_players_sex",
        "players",
        "sex IS NULL OR sex IN ('Masculino', 'Femenino')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_players_sex", "players", type_="check")
    op.drop_column("players", "sex")
