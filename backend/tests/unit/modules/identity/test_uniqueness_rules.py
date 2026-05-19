import unittest

from core.exceptions import AppException
from modules.players.domain import validate_unique_player_email
from modules.teams.domain import validate_unique_team_name
from modules.users.domain import validate_unique_user_email


class UniquenessRulesTest(unittest.TestCase):
    def test_unique_rules_accept_empty_existing_id(self):
        validate_unique_team_name(None)
        validate_unique_player_email(None)
        validate_unique_user_email(None)

    def test_unique_rules_accept_current_entity(self):
        validate_unique_team_name(existing_team_id=7, current_team_id=7)
        validate_unique_player_email(existing_player_id=7, current_player_id=7)
        validate_unique_user_email(existing_user_id=7, current_user_id=7)

    def test_unique_rules_reject_different_existing_entity(self):
        with self.assertRaisesRegex(AppException, "Team name"):
            validate_unique_team_name(existing_team_id=7, current_team_id=8)
        with self.assertRaisesRegex(AppException, "Email|correo"):
            validate_unique_player_email(existing_player_id=7, current_player_id=8)
        with self.assertRaisesRegex(AppException, "Email|correo"):
            validate_unique_user_email(existing_user_id=7, current_user_id=8)


if __name__ == "__main__":
    unittest.main()
