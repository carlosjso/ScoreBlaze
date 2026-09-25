"""add standings tiebreakers to leagues"""

from alembic import op
import sqlalchemy as sa


revision = "20260913_01"
down_revision = "20260908_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leagues",
        sa.Column(
            "standings_tiebreakers",
            sa.JSON(),
            nullable=False,
            server_default=sa.text("'[\"HEAD_TO_HEAD\", \"POINT_DIFFERENCE\", \"POINTS_FOR\"]'::json"),
        ),
    )


def downgrade() -> None:
    op.drop_column("leagues", "standings_tiebreakers")
