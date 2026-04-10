"""Load sample development data."""

from sqlalchemy.orm import Session

from data.entities import Player, Team, TeamMembership
from database.alchemy import SessionLocal


def run() -> None:
    db: Session = SessionLocal()
    try:
        team_1 = Team(name="Tigers")
        team_2 = Team(name="Lions")

        player_1 = Player(name="Carlos Perez", email="carlos@example.com", phone=5551234)
        player_2 = Player(name="Maria Gomez", email="maria@example.com", phone=5555678)

        db.add_all([team_1, team_2, player_1, player_2])
        db.commit()
        db.refresh(team_1)
        db.refresh(team_2)
        db.refresh(player_1)
        db.refresh(player_2)

        db.add_all(
            [
                TeamMembership(player_id=player_1.id, team_id=team_1.id, shirt_number="10"),
                TeamMembership(player_id=player_2.id, team_id=team_1.id, shirt_number="7"),
                TeamMembership(player_id=player_2.id, team_id=team_2.id, shirt_number="9"),
            ]
        )
        db.commit()
        print("Seed completed.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
