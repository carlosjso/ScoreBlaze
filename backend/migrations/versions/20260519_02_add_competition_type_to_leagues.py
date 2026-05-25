"""add competition type to leagues
"""

from alembic import op
import sqlalchemy as sa

revision = "20260519_02"
down_revision = "20260519_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leagues",
        sa.Column("competition_type", sa.String(length=20), nullable=False, server_default="LEAGUE"),
    )
    op.create_index("ix_leagues_competition_type", "leagues", ["competition_type"])
    op.create_check_constraint(
        "ck_leagues_competition_type",
        "leagues",
        "competition_type IN ('LEAGUE', 'ELIMINATION')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_leagues_competition_type", "leagues", type_="check")
    op.drop_index("ix_leagues_competition_type", table_name="leagues")
    op.drop_column("leagues", "competition_type")
