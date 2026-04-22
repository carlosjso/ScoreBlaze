"""create player_stats table"""

from alembic import op
import sqlalchemy as sa

revision = "20260421_01"
down_revision = "20260415_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "player_stats",
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("matches_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("made_1pt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("made_2pt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("made_3pt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("missed_shots", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_assists", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_rebounds", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_fouls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["player_id"],
            ["players.id"],
            name="fk_player_stats_player_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("player_id"),
        sa.CheckConstraint("matches_played >= 0", name="ck_player_stats_matches_played"),
        sa.CheckConstraint("total_points >= 0", name="ck_player_stats_total_points"),
        sa.CheckConstraint("made_1pt >= 0", name="ck_player_stats_made_1pt"),
        sa.CheckConstraint("made_2pt >= 0", name="ck_player_stats_made_2pt"),
        sa.CheckConstraint("made_3pt >= 0", name="ck_player_stats_made_3pt"),
        sa.CheckConstraint("missed_shots >= 0", name="ck_player_stats_missed_shots"),
        sa.CheckConstraint("total_assists >= 0", name="ck_player_stats_total_assists"),
        sa.CheckConstraint("total_rebounds >= 0", name="ck_player_stats_total_rebounds"),
        sa.CheckConstraint("total_fouls >= 0", name="ck_player_stats_total_fouls"),
    )


def downgrade() -> None:
    op.drop_table("player_stats")
