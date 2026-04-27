"""create players, teams and team_memberships tables"""

from alembic import op
import sqlalchemy as sa

revision = "20240409_01"
down_revision = "20260414_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "teams",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=250), nullable=False),
        sa.Column("logo", sa.LargeBinary(), nullable=True),
        sa.UniqueConstraint("name", name="uq_teams_name"),
    )

    # Players conectado con users
    op.create_table(
        "players",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("name", sa.String(length=250), nullable=False),
        sa.Column("phone", sa.BigInteger(), nullable=True),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_players_user_id",
            ondelete="CASCADE",
        ),

        sa.UniqueConstraint("user_id", name="uq_players_user_id"),
    )
    op.create_table(
        "team_memberships",
        sa.Column("player_id", sa.BigInteger(), nullable=False),
        sa.Column("team_id", sa.BigInteger(), nullable=False),
        sa.Column("shirt_number", sa.String(length=20), nullable=True),

        sa.ForeignKeyConstraint(
            ["player_id"],
            ["players.id"],
            name="fk_team_memberships_player_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["team_id"],
            ["teams.id"],
            name="fk_team_memberships_team_id",
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("player_id", "team_id"),
    )

    op.create_index(
        "ix_team_memberships_player_id",
        "team_memberships",
        ["player_id"],
    )
    op.create_index(
        "ix_team_memberships_team_id",
        "team_memberships",
        ["team_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_team_memberships_team_id", table_name="team_memberships")
    op.drop_index("ix_team_memberships_player_id", table_name="team_memberships")
    op.drop_table("team_memberships")
    op.drop_table("players")
    op.drop_table("teams")