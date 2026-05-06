"""data_validations

Revision ID: 4904a0521f6a
Revises: 20260505_01
Create Date: 2026-05-06 11:44:24.970728
"""

from alembic import op
import sqlalchemy as sa

revision = '4904a0521f6a'
down_revision = '20260505_01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "players",
        "name",
        existing_type=sa.String(length=250),
        type_=sa.String(length=50),
    )

    op.alter_column(
        "players",
        "phone",
        existing_type=sa.BigInteger(),
        type_=sa.String(length=10),
        existing_nullable=True,
    )

    op.create_check_constraint(
        "ck_players_phone_format",
        "players",
        "phone IS NULL OR phone ~ '^[0-9]{10}$'"
    )

    op.alter_column(
        "teams",
        "name",
        existing_type=sa.String(length=250),
        type_=sa.String(length=50),
    )

    op.create_check_constraint(
        "ck_players_name_not_empty",
        "players",
        "length(name) > 0"
    )

    op.create_check_constraint(
        "ck_teams_name_not_empty",
        "teams",
        "length(name) > 0"
    )

    op.create_check_constraint(
        "ck_roles_name_not_empty",
        "roles",
        "length(name) > 0"
    )

    op.create_index(
        "uq_roles_name_lower",
        "roles",
        [sa.text("LOWER(name)")],
        unique=True
    )

    op.create_check_constraint(
        "ck_users_name_not_empty",
        "users",
        "length(name) > 0"
    )

    op.create_check_constraint(
        "ck_users_email_not_empty",
        "users",
        "length(email) > 0"
    )

    op.create_index(
        "uq_users_email_lower",
        "users",
        [sa.text("LOWER(email)")],
        unique=True
    )


def downgrade() -> None:
    op.drop_index("uq_users_email_lower", table_name="users")

    op.drop_constraint(
        "ck_users_email_not_empty",
        "users",
        type_="check"
    )

    op.drop_constraint(
        "ck_users_name_not_empty",
        "users",
        type_="check"
    )

    op.drop_index("uq_roles_name_lower", table_name="roles")

    op.drop_constraint(
        "ck_roles_name_not_empty",
        "roles",
        type_="check"
    )

    op.drop_constraint(
        "ck_players_phone_format",
        "players",
        type_="check"
    )

    op.drop_constraint(
        "ck_players_name_not_empty",
        "players",
        type_="check"
    )

    op.drop_constraint(
        "ck_teams_name_not_empty",
        "teams",
        type_="check"
    )

    op.alter_column(
        "players",
        "phone",
        existing_type=sa.String(length=10),
        type_=sa.BigInteger(),
        existing_nullable=True,
    )

    op.alter_column(
        "players",
        "name",
        existing_type=sa.String(length=50),
        type_=sa.String(length=250),
    )

    op.alter_column(
        "teams",
        "name",
        existing_type=sa.String(length=50),
        type_=sa.String(length=250),
    )