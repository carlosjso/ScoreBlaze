"""create matches table"""

from alembic import op
import sqlalchemy as sa

revision = "20260415_01"
down_revision = "20260414_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "matches",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("match_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("team_a_id", sa.BigInteger(), nullable=False),
        sa.Column("team_b_id", sa.BigInteger(), nullable=False),
        sa.Column("score_team_a", sa.Integer(), nullable=True),
        sa.Column("score_team_b", sa.Integer(), nullable=True),
        sa.Column("winner_team_id", sa.BigInteger(), nullable=True),
        sa.Column("is_draw", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("court", sa.String(length=250), nullable=True),
        sa.Column("tournament", sa.String(length=250), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
        sa.ForeignKeyConstraint(
            ["team_a_id"],
            ["teams.id"],
            name="fk_matches_team_a_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["team_b_id"],
            ["teams.id"],
            name="fk_matches_team_b_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["winner_team_id"],
            ["teams.id"],
            name="fk_matches_winner_team_id",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint("team_a_id <> team_b_id", name="ck_matches_distinct_teams"),
        sa.CheckConstraint("start_time < end_time", name="ck_matches_schedule"),
        sa.CheckConstraint("(score_team_a IS NULL OR score_team_a >= 0)", name="ck_matches_score_team_a"),
        sa.CheckConstraint("(score_team_b IS NULL OR score_team_b >= 0)", name="ck_matches_score_team_b"),
        sa.CheckConstraint("status IN ('scheduled', 'live', 'finished')", name="ck_matches_status"),
    )
    op.create_index("ix_matches_match_date", "matches", ["match_date"])
    op.create_index("ix_matches_status", "matches", ["status"])
    op.create_index("ix_matches_team_a_id", "matches", ["team_a_id"])
    op.create_index("ix_matches_team_b_id", "matches", ["team_b_id"])
    op.create_index("ix_matches_winner_team_id", "matches", ["winner_team_id"])


def downgrade() -> None:
    op.drop_index("ix_matches_winner_team_id", table_name="matches")
    op.drop_index("ix_matches_team_b_id", table_name="matches")
    op.drop_index("ix_matches_team_a_id", table_name="matches")
    op.drop_index("ix_matches_status", table_name="matches")
    op.drop_index("ix_matches_match_date", table_name="matches")
    op.drop_table("matches")
