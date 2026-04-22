"""align matches and match_events with latest schema"""

from alembic import op
import sqlalchemy as sa

revision = "20260421_04"
down_revision = "20260421_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "matches",
        sa.Column("status", sa.String(length=20), nullable=False, server_default="scheduled"),
    )
    op.create_index("ix_matches_status", "matches", ["status"])
    op.create_check_constraint(
        "ck_matches_status",
        "matches",
        "status IN ('scheduled', 'live', 'finished')",
    )

    op.alter_column("match_events", "status", server_default="active")
    op.create_index("ix_match_events_event_type", "match_events", ["event_type"])
    op.create_index("ix_match_events_status", "match_events", ["status"])
    op.create_unique_constraint(
        "ux_match_events_match_event_order",
        "match_events",
        ["match_id", "event_order"],
    )
    op.drop_constraint("ck_match_events_period", "match_events", type_="check")
    op.create_check_constraint("ck_match_events_period", "match_events", "period >= 1")
    op.create_check_constraint(
        "ck_match_events_actor",
        "match_events",
        "((player_id IS NOT NULL AND guest_name IS NULL) OR (player_id IS NULL AND guest_name IS NOT NULL))",
    )
    op.create_check_constraint(
        "ck_match_events_event_type",
        "match_events",
        "event_type IN ('point_1', 'point_2', 'point_3', 'miss', 'foul', 'rebound', 'assist')",
    )
    op.create_check_constraint(
        "ck_match_events_status",
        "match_events",
        "status IN ('active', 'voided')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_match_events_status", "match_events", type_="check")
    op.drop_constraint("ck_match_events_event_type", "match_events", type_="check")
    op.drop_constraint("ck_match_events_actor", "match_events", type_="check")
    op.drop_constraint("ck_match_events_period", "match_events", type_="check")
    op.create_check_constraint("ck_match_events_period", "match_events", "period >= 0")
    op.drop_constraint("ux_match_events_match_event_order", "match_events", type_="unique")
    op.drop_index("ix_match_events_status", table_name="match_events")
    op.drop_index("ix_match_events_event_type", table_name="match_events")
    op.alter_column("match_events", "status", server_default=None)

    op.drop_constraint("ck_matches_status", "matches", type_="check")
    op.drop_index("ix_matches_status", table_name="matches")
    op.drop_column("matches", "status")
