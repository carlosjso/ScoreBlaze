import unittest
from datetime import time

from core.exceptions import AppException
from modules.matches.domain import (
    resolve_match_result,
    validate_match_schedule,
    validate_match_teams,
)


class MatchRulesTest(unittest.TestCase):
    def test_validate_match_schedule_accepts_ordered_times(self):
        validate_match_schedule(time(10, 0), time(11, 0))

    def test_validate_match_schedule_rejects_invalid_order(self):
        with self.assertRaisesRegex(AppException, "Start time"):
            validate_match_schedule(time(11, 0), time(10, 0))

    def test_validate_match_teams_rejects_same_team(self):
        with self.assertRaisesRegex(AppException, "different"):
            validate_match_teams(team_a_id=1, team_b_id=1, winner_team_id=None)

    def test_validate_match_teams_rejects_winner_outside_match(self):
        with self.assertRaisesRegex(AppException, "Winner team"):
            validate_match_teams(team_a_id=1, team_b_id=2, winner_team_id=3)

    def test_resolve_match_result_sets_winner_from_scores(self):
        result = resolve_match_result(
            team_a_id=1,
            team_b_id=2,
            score_team_a=80,
            score_team_b=75,
            winner_team_id=None,
            is_draw=False,
        )

        self.assertEqual(result.winner_team_id, 1)
        self.assertFalse(result.is_draw)

    def test_resolve_match_result_sets_draw_for_equal_scores(self):
        result = resolve_match_result(
            team_a_id=1,
            team_b_id=2,
            score_team_a=80,
            score_team_b=80,
            winner_team_id=None,
            is_draw=False,
        )

        self.assertIsNone(result.winner_team_id)
        self.assertTrue(result.is_draw)

    def test_resolve_match_result_rejects_partial_score(self):
        with self.assertRaisesRegex(AppException, "Both scores"):
            resolve_match_result(
                team_a_id=1,
                team_b_id=2,
                score_team_a=80,
                score_team_b=None,
                winner_team_id=None,
                is_draw=False,
            )


if __name__ == "__main__":
    unittest.main()
