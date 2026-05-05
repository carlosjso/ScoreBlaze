import unittest

from core.exceptions import AppException
from modules.match_events.domain import MatchEventType
from modules.scoreboard.domain import BasketballScoreboardRules


class BasketballScoreboardRulesTest(unittest.TestCase):
    def setUp(self):
        self.rules = BasketballScoreboardRules()

    def test_points_for_event_resolves_basketball_points(self):
        self.assertEqual(self.rules.points_for_event(MatchEventType.POINT_1), 1)
        self.assertEqual(self.rules.points_for_event(MatchEventType.POINT_2), 2)
        self.assertEqual(self.rules.points_for_event(MatchEventType.POINT_3), 3)
        self.assertEqual(self.rules.points_for_event(MatchEventType.ASSIST), 0)
        self.assertEqual(self.rules.points_for_event(MatchEventType.POINT_1.value), 1)

    def test_validate_actor_returns_player_actor(self):
        self.assertEqual(self.rules.validate_actor(player_id=9, guest_name=None), (9, None))

    def test_validate_actor_returns_normalized_guest_actor(self):
        self.assertEqual(self.rules.validate_actor(player_id=None, guest_name="  Visitor  "), (None, "Visitor"))

    def test_validate_actor_rejects_ambiguous_actor(self):
        with self.assertRaisesRegex(AppException, "exactamente un actor"):
            self.rules.validate_actor(player_id=9, guest_name="Visitor")

    def test_increment_non_negative_never_drops_below_zero(self):
        self.assertEqual(self.rules.increment_non_negative(3, -5), 0)
        self.assertEqual(self.rules.increment_non_negative(3, 2), 5)


if __name__ == "__main__":
    unittest.main()
