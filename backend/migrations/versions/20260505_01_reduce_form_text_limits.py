"""reduce text limits for active forms
"""

from alembic import op
import sqlalchemy as sa

revision = "20260505_01"
down_revision = "20260429_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("teams", "name", existing_type=sa.String(length=250), type_=sa.String(length=80))
    op.alter_column("teams", "responsible_name", existing_type=sa.String(length=250), type_=sa.String(length=100))
    op.alter_column("teams", "responsible_phone", existing_type=sa.String(length=30), type_=sa.String(length=19))
    op.alter_column("teams", "responsible_email", existing_type=sa.String(length=250), type_=sa.String(length=120))

    op.alter_column("players", "name", existing_type=sa.String(length=250), type_=sa.String(length=100))
    op.alter_column("players", "email", existing_type=sa.String(length=250), type_=sa.String(length=120))

    op.alter_column("matches", "court", existing_type=sa.String(length=250), type_=sa.String(length=80))
    op.alter_column("matches", "tournament", existing_type=sa.String(length=250), type_=sa.String(length=100))


def downgrade() -> None:
    op.alter_column("matches", "tournament", existing_type=sa.String(length=100), type_=sa.String(length=250))
    op.alter_column("matches", "court", existing_type=sa.String(length=80), type_=sa.String(length=250))

    op.alter_column("players", "email", existing_type=sa.String(length=120), type_=sa.String(length=250))
    op.alter_column("players", "name", existing_type=sa.String(length=100), type_=sa.String(length=250))

    op.alter_column("teams", "responsible_email", existing_type=sa.String(length=120), type_=sa.String(length=250))
    op.alter_column("teams", "responsible_phone", existing_type=sa.String(length=19), type_=sa.String(length=30))
    op.alter_column("teams", "responsible_name", existing_type=sa.String(length=100), type_=sa.String(length=250))
    op.alter_column("teams", "name", existing_type=sa.String(length=80), type_=sa.String(length=250))
