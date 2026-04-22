"""create team_stats table"""

from alembic import op
import sqlalchemy as sa

revision = "20260421_02"
down_revision = "20260421_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "team_stats",
        sa.Column("team_id", sa.BigInteger(), nullable=False),
        sa.Column("matches_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("losses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("draws", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("points_for", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("points_against", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("points_difference", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("standings_points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_team_fouls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name="fk_team_stats_team_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("team_id"),
        sa.CheckConstraint("matches_played >= 0", name="ck_team_stats_matches_played"),
        sa.CheckConstraint("wins >= 0", name="ck_team_stats_wins"),
        sa.CheckConstraint("losses >= 0", name="ck_team_stats_losses"),
        sa.CheckConstraint("draws >= 0", name="ck_team_stats_draws"),
        sa.CheckConstraint("points_for >= 0", name="ck_team_stats_points_for"),
        sa.CheckConstraint("points_against >= 0", name="ck_team_stats_points_against"),
        sa.CheckConstraint("standings_points >= 0", name="ck_team_stats_standings_points"),
        sa.CheckConstraint("total_team_fouls >= 0", name="ck_team_stats_total_team_fouls"),
    )


def downgrade() -> None:
    op.drop_table("team_stats")
