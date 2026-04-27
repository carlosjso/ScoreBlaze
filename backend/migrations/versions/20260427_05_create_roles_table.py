"""create_roles_table

Revision ID: c37e3d261d1a
Revises: 20260421_04
Create Date: 2026-04-27 09:51:10.787721
"""

from alembic import op
import sqlalchemy as sa

revision = '20260427_05'
down_revision = '20260421_04'
branch_labels = None
depends_on = None


def upgrade():
    # 🔹 Tabla de roles
    op.create_table(
        "roles",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.UniqueConstraint("name", name="uq_roles_name"),
    )

    # 🔹 Tabla intermedia user_roles (muchos a muchos)
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("role_id", sa.BigInteger(), nullable=False),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_user_roles_user_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["role_id"],
            ["roles.id"],
            name="fk_user_roles_role_id",
            ondelete="CASCADE",
        ),

        sa.PrimaryKeyConstraint("user_id", "role_id"),
    )

    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("ix_user_roles_role_id", "user_roles", ["role_id"])

    #op.execute("""
     #   INSERT INTO roles (name) VALUES
      #  ('admin'),
       # ('coach'),
        #('player')
    #""")


def downgrade():
    op.drop_index("ix_user_roles_role_id", table_name="user_roles")
    op.drop_index("ix_user_roles_user_id", table_name="user_roles")
    op.drop_table("user_roles")
    op.drop_table("roles")