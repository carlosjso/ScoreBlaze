"""sync leagues and matches schema for group-stage support
"""

from alembic import op
import sqlalchemy as sa

revision = "20260831_01"
down_revision = "20260519_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("leagues", sa.Column("group_stage_config", sa.JSON(), nullable=True))

    op.drop_constraint("ck_leagues_competition_type", "leagues", type_="check")
    op.create_check_constraint(
        "ck_leagues_competition_type",
        "leagues",
        "competition_type IN ('LEAGUE', 'ELIMINATION', 'GROUPS')",
    )

    op.add_column(
        "matches",
        sa.Column("competition_stage", sa.String(length=20), nullable=False, server_default="REGULAR_SEASON"),
    )
    op.add_column("matches", sa.Column("group_stage_group_key", sa.String(length=20), nullable=True))
    op.create_check_constraint(
        "ck_matches_competition_stage",
        "matches",
        "competition_stage IN ('REGULAR_SEASON', 'GROUP_STAGE', 'FINAL_PHASE')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_matches_competition_stage", "matches", type_="check")
    op.drop_column("matches", "group_stage_group_key")
    op.drop_column("matches", "competition_stage")

    op.drop_constraint("ck_leagues_competition_type", "leagues", type_="check")
    op.create_check_constraint(
        "ck_leagues_competition_type",
        "leagues",
        "competition_type IN ('LEAGUE', 'ELIMINATION')",
    )
    op.drop_column("leagues", "group_stage_config")
