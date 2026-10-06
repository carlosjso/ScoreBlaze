"""remove leading zeroes from previously generated shirt numbers"""

from alembic import op
import sqlalchemy as sa


revision = "20261005_02"
down_revision = "20261005_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    memberships = list(
        connection.execute(
            sa.text(
                "SELECT player_id, team_id, shirt_number "
                "FROM team_memberships ORDER BY team_id, player_id"
            )
        ).mappings()
    )
    used_by_team: dict[int, set[str]] = {}
    for membership in memberships:
        team_id = int(membership["team_id"])
        used_by_team.setdefault(team_id, set()).add(membership["shirt_number"].strip().lower())

    for membership in memberships:
        current = membership["shirt_number"].strip()
        if not current.isdigit() or len(current) == 1 or not current.startswith("0"):
            continue
        normalized = str(int(current))
        team_id = int(membership["team_id"])
        used_numbers = used_by_team[team_id]
        if normalized.lower() in used_numbers:
            continue
        connection.execute(
            sa.text(
                "UPDATE team_memberships SET shirt_number = :shirt_number "
                "WHERE player_id = :player_id AND team_id = :team_id"
            ),
            {
                "shirt_number": normalized,
                "player_id": int(membership["player_id"]),
                "team_id": team_id,
            },
        )
        used_numbers.remove(current.lower())
        used_numbers.add(normalized.lower())


def downgrade() -> None:
    # User-selected formatting cannot be distinguished safely after this point.
    pass
