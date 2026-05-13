"""create match_player_participations table"""

from alembic import op
import sqlalchemy as sa

revision = "20260513_01"
down_revision = "20260508_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "match_player_participations",
        sa.Column("match_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.BigInteger(), nullable=False),
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("present", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("played", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["player_id"], ["players.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("match_id", "team_id", "player_id"),
        sa.CheckConstraint(
            "NOT (played = true AND present = false)",
            name="ck_match_player_participations_played_requires_present",
        ),
    )


def downgrade() -> None:
    op.drop_table("match_player_participations")
