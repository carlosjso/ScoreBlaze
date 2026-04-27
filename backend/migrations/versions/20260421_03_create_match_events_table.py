"""create match_events table"""

from alembic import op
import sqlalchemy as sa

revision = "20260421_03"
down_revision = "20260421_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "match_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("match_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.BigInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=True),
        sa.Column("guest_name", sa.String(length=250), nullable=True),
        sa.Column("event_type", sa.String(length=30), nullable=False),
        sa.Column("period", sa.Integer(), nullable=False),
        sa.Column("elapsed_seconds", sa.Integer(), nullable=False),
        sa.Column("event_order", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["match_id"],
            ["matches.id"],
            name="fk_match_events_match_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name="fk_match_events_team_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["player_id"],
            ["players.id"],
            name="fk_match_events_player_id",
            ondelete="SET NULL",
        ),
        sa.CheckConstraint(
            "((player_id IS NOT NULL AND guest_name IS NULL) OR (player_id IS NULL AND guest_name IS NOT NULL))",
            name="ck_match_events_actor",
        ),
        sa.CheckConstraint(
            "event_type IN ('point_1', 'point_2', 'point_3', 'miss', 'foul', 'rebound', 'assist')",
            name="ck_match_events_event_type",
        ),
        sa.CheckConstraint("status IN ('active', 'voided')", name="ck_match_events_status"),
        sa.CheckConstraint("period >= 1", name="ck_match_events_period"),
        sa.CheckConstraint("elapsed_seconds >= 0", name="ck_match_events_elapsed_seconds"),
        sa.CheckConstraint("event_order >= 0", name="ck_match_events_event_order"),
        sa.UniqueConstraint("match_id", "event_order", name="ux_match_events_match_event_order"),
    )
    op.create_index("ix_match_events_event_type", "match_events", ["event_type"])
    op.create_index("ix_match_events_match_id", "match_events", ["match_id"])
    op.create_index("ix_match_events_team_id", "match_events", ["team_id"])
    op.create_index("ix_match_events_player_id", "match_events", ["player_id"])
    op.create_index("ix_match_events_status", "match_events", ["status"])


def downgrade() -> None:
    op.drop_index("ix_match_events_status", table_name="match_events")
    op.drop_index("ix_match_events_player_id", table_name="match_events")
    op.drop_index("ix_match_events_team_id", table_name="match_events")
    op.drop_index("ix_match_events_match_id", table_name="match_events")
    op.drop_index("ix_match_events_event_type", table_name="match_events")
    op.drop_table("match_events")
