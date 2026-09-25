"""add regular season format to leagues"""

from alembic import op
import sqlalchemy as sa


revision = "20260908_01"
down_revision = "20260901_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leagues",
        sa.Column("regular_season_format", sa.String(length=20), nullable=False, server_default="SINGLE_ROUND"),
    )
    op.create_check_constraint(
        "ck_leagues_regular_season_format",
        "leagues",
        "regular_season_format IN ('SINGLE_ROUND', 'DOUBLE_ROUND')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_leagues_regular_season_format", "leagues", type_="check")
    op.drop_column("leagues", "regular_season_format")
