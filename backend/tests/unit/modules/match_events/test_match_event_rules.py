import unittest

from core.exceptions import AppException
from modules.match_events.domain import normalize_guest_name, validate_event_actor


class MatchEventRulesTest(unittest.TestCase):
    def test_normalize_guest_name_strips_empty_values(self):
        self.assertIsNone(normalize_guest_name("  "))
        self.assertEqual(normalize_guest_name("  Guest  "), "Guest")

    def test_validate_event_actor_accepts_player_actor(self):
        self.assertIsNone(validate_event_actor(player_id=10, guest_name=None))

    def test_validate_event_actor_accepts_guest_actor(self):
        self.assertEqual(validate_event_actor(player_id=None, guest_name="  Guest  "), "Guest")

    def test_validate_event_actor_rejects_missing_actor(self):
        with self.assertRaisesRegex(AppException, "exactly one actor"):
            validate_event_actor(player_id=None, guest_name=None)

    def test_validate_event_actor_rejects_two_actors(self):
        with self.assertRaisesRegex(AppException, "exactly one actor"):
            validate_event_actor(player_id=10, guest_name="Guest")


if __name__ == "__main__":
    unittest.main()
