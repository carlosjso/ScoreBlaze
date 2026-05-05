import unittest
from types import SimpleNamespace

from modules.match_events.domain import MatchEventType
from modules.scoreboard.domain import BasketballScoreboardRules
from modules.scoreboard.score_projector import ScoreboardScoreProjector


class ScoreboardScoreProjectorTest(unittest.TestCase):
    def setUp(self):
        self.projector = ScoreboardScoreProjector(BasketballScoreboardRules())

    def test_applies_scores_and_winner_from_active_events(self):
        match = SimpleNamespace(
            team_a_id=1,
            team_b_id=2,
            score_team_a=None,
            score_team_b=None,
            winner_team_id=None,
            is_draw=False,
        )
        events = [
            SimpleNamespace(event_type=MatchEventType.POINT_3, team_id=1),
            SimpleNamespace(event_type=MatchEventType.POINT_2, team_id=2),
            SimpleNamespace(event_type=MatchEventType.ASSIST, team_id=2),
        ]

        score_state = self.projector.project(match, events)

        self.assertEqual(score_state.score_team_a, 3)
        self.assertEqual(score_state.score_team_b, 2)
        self.assertEqual(score_state.winner_team_id, 1)
        self.assertFalse(score_state.is_draw)

    def test_clears_scores_when_there_are_no_point_events(self):
        match = SimpleNamespace(
            team_a_id=1,
            team_b_id=2,
            score_team_a=10,
            score_team_b=9,
            winner_team_id=1,
            is_draw=False,
        )

        score_state = self.projector.project(match, [SimpleNamespace(event_type=MatchEventType.FOUL, team_id=1)])

        self.assertIsNone(score_state.score_team_a)
        self.assertIsNone(score_state.score_team_b)
        self.assertIsNone(score_state.winner_team_id)
        self.assertFalse(score_state.is_draw)


if __name__ == "__main__":
    unittest.main()
