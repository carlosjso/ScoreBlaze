"""add final phase seed mode to leagues"""

from alembic import op
import sqlalchemy as sa


revision = "20260913_02"
down_revision = "20260913_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leagues",
        sa.Column("final_phase_seed_mode", sa.String(length=20), nullable=False, server_default="STANDINGS"),
    )
    op.create_check_constraint(
        "ck_leagues_final_phase_seed_mode",
        "leagues",
        "final_phase_seed_mode IN ('STANDINGS', 'RANDOM', 'MANUAL')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_leagues_final_phase_seed_mode", "leagues", type_="check")
    op.drop_column("leagues", "final_phase_seed_mode")
