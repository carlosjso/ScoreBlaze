"""add contact fields to teams table"""

from alembic import op
import sqlalchemy as sa

revision = "20260428_01"
down_revision = "20260421_03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("teams", sa.Column("responsible_name", sa.String(length=250), nullable=True))
    op.add_column("teams", sa.Column("responsible_phone", sa.String(length=30), nullable=True))
    op.add_column("teams", sa.Column("responsible_email", sa.String(length=250), nullable=True))


def downgrade() -> None:
    op.drop_column("teams", "responsible_email")
    op.drop_column("teams", "responsible_phone")
    op.drop_column("teams", "responsible_name")
