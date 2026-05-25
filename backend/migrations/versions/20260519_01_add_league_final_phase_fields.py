"""add league final phase fields
"""

from alembic import op
import sqlalchemy as sa

revision = "20260519_01"
down_revision = "20260514_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leagues",
        sa.Column("final_phase_enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_preset", sa.String(length=40), nullable=False, server_default="TOP_8_SINGLE_GAME"),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_qualified_teams", sa.Integer(), nullable=False, server_default="8"),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_byes", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_two_legs", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_third_place_match", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "leagues",
        sa.Column(
            "final_phase_seeded_home_advantage",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )

    op.create_check_constraint(
        "ck_leagues_final_phase_preset",
        "leagues",
        (
            "final_phase_preset IN ("
            "'TOP_4_SINGLE_GAME', "
            "'TOP_8_SINGLE_GAME', "
            "'TOP_8_HOME_AWAY', "
            "'TOP_6_SINGLE_GAME_WITH_BYES', "
            "'CUSTOM'"
            ")"
        ),
    )
    op.create_check_constraint(
        "ck_leagues_final_phase_qualified_teams",
        "leagues",
        "final_phase_qualified_teams BETWEEN 2 AND 32",
    )
    op.create_check_constraint(
        "ck_leagues_final_phase_byes",
        "leagues",
        "final_phase_byes >= 0 AND final_phase_byes < final_phase_qualified_teams",
    )


def downgrade() -> None:
    op.drop_constraint("ck_leagues_final_phase_byes", "leagues", type_="check")
    op.drop_constraint("ck_leagues_final_phase_qualified_teams", "leagues", type_="check")
    op.drop_constraint("ck_leagues_final_phase_preset", "leagues", type_="check")

    op.drop_column("leagues", "final_phase_seeded_home_advantage")
    op.drop_column("leagues", "final_phase_third_place_match")
    op.drop_column("leagues", "final_phase_two_legs")
    op.drop_column("leagues", "final_phase_byes")
    op.drop_column("leagues", "final_phase_qualified_teams")
    op.drop_column("leagues", "final_phase_preset")
    op.drop_column("leagues", "final_phase_enabled")
