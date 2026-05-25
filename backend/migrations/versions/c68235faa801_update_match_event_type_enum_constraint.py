"""update match_event_type enum constraint

Revision ID: c68235faa801
Revises: 20260519_03
Create Date: 2026-05-25 09:10:13.619048
"""

from alembic import op
import sqlalchemy as sa

revision = 'c68235faa801'
down_revision = '20260519_03'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # 1. Drop old constraint
    op.drop_constraint(
        "ck_match_events_event_type",
        "match_events",
        type_="check",
    )

    # 2. Recreate with updated values
    op.create_check_constraint(
        "ck_match_events_event_type",
        "match_events",
        "event_type IN ("
        "'point_1', "
        "'point_2', "
        "'point_3', "
        "'miss', "
        "'foul', "
        "'rebound', "
        "'assist', "
        "'steal', "
        "'block'"
        ")",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_match_events_event_type",
        "match_events",
        type_="check",
    )

    op.create_check_constraint(
        "ck_match_events_event_type",
        "match_events",
        "event_type IN ("
        "'point_1', "
        "'point_2', "
        "'point_3', "
        "'miss', "
        "'foul', "
        "'rebound', "
        "'assist'"
        ")",
    )