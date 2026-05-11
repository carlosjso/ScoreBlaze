"""create leagues tables and link matches
"""

from alembic import op
import sqlalchemy as sa

revision = "20260508_01"
down_revision = "20260506_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "leagues",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("responsible_name", sa.String(length=100), nullable=False),
        sa.Column("responsible_email", sa.String(length=120), nullable=False),
        sa.Column("category", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="Sin empezar"),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("logo", sa.LargeBinary(), nullable=True),
        sa.Column("tracked_stats", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.UniqueConstraint("name", name="uq_leagues_name"),
        sa.CheckConstraint("length(name) > 0", name="ck_leagues_name_not_empty"),
        sa.CheckConstraint("length(category) > 0", name="ck_leagues_category_not_empty"),
        sa.CheckConstraint("start_date <= end_date", name="ck_leagues_schedule"),
        sa.CheckConstraint("status IN ('Sin empezar', 'En curso', 'Finalizada')", name="ck_leagues_status"),
    )
    op.create_index("ix_leagues_name", "leagues", ["name"])
    op.create_index("ix_leagues_status", "leagues", ["status"])
    op.create_index("ix_leagues_start_date", "leagues", ["start_date"])
    op.create_index("ix_leagues_end_date", "leagues", ["end_date"])

    op.create_table(
        "league_team_memberships",
        sa.Column("league_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.BigInteger(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="1"),
        sa.ForeignKeyConstraint(
            ["league_id"],
            ["leagues.id"],
            name="fk_league_team_memberships_league_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name="fk_league_team_memberships_team_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("league_id", "team_id"),
        sa.UniqueConstraint("league_id", "sort_order", name="ux_league_team_memberships_league_sort_order"),
        sa.CheckConstraint("sort_order >= 1", name="ck_league_team_memberships_sort_order"),
    )
    op.create_index("ix_league_team_memberships_league_id", "league_team_memberships", ["league_id"])
    op.create_index("ix_league_team_memberships_team_id", "league_team_memberships", ["team_id"])

    op.create_table(
        "league_stats",
        sa.Column("league_id", sa.BigInteger(), nullable=False),
        sa.Column("stats_payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(
            ["league_id"],
            ["leagues.id"],
            name="fk_league_stats_league_id",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("league_id"),
    )

    op.add_column("matches", sa.Column("league_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_matches_league_id",
        "matches",
        "leagues",
        ["league_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_matches_league_id", "matches", ["league_id"])


def downgrade() -> None:
    op.drop_index("ix_matches_league_id", table_name="matches")
    op.drop_constraint("fk_matches_league_id", "matches", type_="foreignkey")
    op.drop_column("matches", "league_id")

    op.drop_table("league_stats")

    op.drop_index("ix_league_team_memberships_team_id", table_name="league_team_memberships")
    op.drop_index("ix_league_team_memberships_league_id", table_name="league_team_memberships")
    op.drop_table("league_team_memberships")

    op.drop_index("ix_leagues_end_date", table_name="leagues")
    op.drop_index("ix_leagues_start_date", table_name="leagues")
    op.drop_index("ix_leagues_status", table_name="leagues")
    op.drop_index("ix_leagues_name", table_name="leagues")
    op.drop_table("leagues")
