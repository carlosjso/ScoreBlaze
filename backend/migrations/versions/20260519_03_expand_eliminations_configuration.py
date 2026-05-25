"""expand eliminations configuration
"""

from alembic import op
import sqlalchemy as sa

revision = "20260519_03"
down_revision = "20260519_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "leagues",
        sa.Column("final_phase_format", sa.String(length=40), nullable=False, server_default="SINGLE_ELIMINATION"),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_play_in_slots", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_round_best_of", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_final_best_of", sa.Integer(), nullable=False, server_default="1"),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_reseed_each_round", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "leagues",
        sa.Column("final_phase_grand_final_reset", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    op.drop_constraint("ck_leagues_final_phase_preset", "leagues", type_="check")
    op.create_check_constraint(
        "ck_leagues_final_phase_preset",
        "leagues",
        (
            "final_phase_preset IN ("
            "'TOP_4_SINGLE_GAME', "
            "'TOP_8_SINGLE_GAME', "
            "'TOP_8_HOME_AWAY', "
            "'TOP_6_SINGLE_GAME_WITH_BYES', "
            "'TOP_16_SINGLE_GAME', "
            "'TOP_32_SINGLE_GAME', "
            "'NBA_PLAY_IN_TOP_10', "
            "'DOUBLE_ELIMINATION_TOP_8', "
            "'DOUBLE_ELIMINATION_TOP_16', "
            "'CUSTOM'"
            ")"
        ),
    )

    op.create_check_constraint(
        "ck_leagues_final_phase_format",
        "leagues",
        "final_phase_format IN ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'PLAY_IN_PLUS_BRACKET')",
    )
    op.create_check_constraint(
        "ck_leagues_final_phase_round_best_of",
        "leagues",
        "final_phase_round_best_of IN (1, 3, 5, 7)",
    )
    op.create_check_constraint(
        "ck_leagues_final_phase_final_best_of",
        "leagues",
        "final_phase_final_best_of IN (1, 3, 5, 7)",
    )
    op.create_check_constraint(
        "ck_leagues_final_phase_play_in_slots",
        "leagues",
        "final_phase_play_in_slots >= 0 AND final_phase_play_in_slots < final_phase_qualified_teams",
    )


def downgrade() -> None:
    op.drop_constraint("ck_leagues_final_phase_play_in_slots", "leagues", type_="check")
    op.drop_constraint("ck_leagues_final_phase_final_best_of", "leagues", type_="check")
    op.drop_constraint("ck_leagues_final_phase_round_best_of", "leagues", type_="check")
    op.drop_constraint("ck_leagues_final_phase_format", "leagues", type_="check")

    op.drop_constraint("ck_leagues_final_phase_preset", "leagues", type_="check")
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

    op.drop_column("leagues", "final_phase_grand_final_reset")
    op.drop_column("leagues", "final_phase_reseed_each_round")
    op.drop_column("leagues", "final_phase_final_best_of")
    op.drop_column("leagues", "final_phase_round_best_of")
    op.drop_column("leagues", "final_phase_play_in_slots")
    op.drop_column("leagues", "final_phase_format")
