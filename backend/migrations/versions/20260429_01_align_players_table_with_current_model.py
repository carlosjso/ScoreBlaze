"""align players table with current model
"""

from alembic import op
import sqlalchemy as sa

revision = "20260429_01"
down_revision = "20260428_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("players", sa.Column("email", sa.String(length=250), nullable=True))

    op.execute(
        """
        UPDATE players
        SET email = users.email
        FROM users
        WHERE players.user_id = users.id
          AND players.email IS NULL
        """
    )

    op.alter_column("players", "email", nullable=False)
    op.create_unique_constraint("uq_players_email", "players", ["email"])
    op.create_index("ix_players_email", "players", ["email"])

    op.drop_index("ix_players_user_id", table_name="players")
    op.drop_constraint("fk_players_user_id", "players", type_="foreignkey")
    op.drop_column("players", "user_id")


def downgrade() -> None:
    op.add_column("players", sa.Column("user_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key(
        "fk_players_user_id",
        "players",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("ix_players_user_id", "players", ["user_id"])

    op.drop_index("ix_players_email", table_name="players")
    op.drop_constraint("uq_players_email", "players", type_="unique")
    op.drop_column("players", "email")
