"""require a unique shirt number for every team membership"""

from alembic import op
import sqlalchemy as sa


revision = "20261005_01"
down_revision = ("20260524_01", "20260913_02")
branch_labels = None
depends_on = None


def _number_key(value: str) -> str:
    normalized = value.strip().lower()
    return str(int(normalized)) if normalized.isdigit() else normalized


def upgrade() -> None:
    connection = op.get_bind()
    memberships = connection.execute(
        sa.text(
            "SELECT player_id, team_id, shirt_number "
            "FROM team_memberships ORDER BY team_id, player_id"
        )
    ).mappings()

    used_by_team: dict[int, set[str]] = {}
    next_by_team: dict[int, int] = {}
    for membership in memberships:
        player_id = int(membership["player_id"])
        team_id = int(membership["team_id"])
        requested = (membership["shirt_number"] or "").strip()
        used_numbers = used_by_team.setdefault(team_id, set())
        number_key = _number_key(requested) if requested else ""

        if requested and number_key not in used_numbers:
            resolved = requested
        else:
            candidate = next_by_team.get(team_id, 1)
            while str(candidate) in used_numbers:
                candidate += 1
            resolved = str(candidate).zfill(2)
            number_key = str(candidate)
            next_by_team[team_id] = candidate + 1

        used_numbers.add(number_key)
        if resolved != membership["shirt_number"]:
            connection.execute(
                sa.text(
                    "UPDATE team_memberships SET shirt_number = :shirt_number "
                    "WHERE player_id = :player_id AND team_id = :team_id"
                ),
                {
                    "shirt_number": resolved,
                    "player_id": player_id,
                    "team_id": team_id,
                },
            )

    op.alter_column(
        "team_memberships",
        "shirt_number",
        existing_type=sa.String(length=20),
        nullable=False,
    )
    op.create_unique_constraint(
        "uq_team_memberships_team_shirt_number",
        "team_memberships",
        ["team_id", "shirt_number"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_team_memberships_team_shirt_number",
        "team_memberships",
        type_="unique",
    )
    op.alter_column(
        "team_memberships",
        "shirt_number",
        existing_type=sa.String(length=20),
        nullable=True,
    )
