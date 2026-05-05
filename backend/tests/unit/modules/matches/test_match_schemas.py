import unittest
from datetime import date, time

from pydantic import ValidationError

from modules.matches.domain import MatchStatus
from modules.matches.schemas import MAX_MATCH_SCORE, MatchPatch, MatchUpdate


class MatchSchemasTest(unittest.TestCase):
    def test_match_update_requires_full_payload(self):
        with self.assertRaises(ValidationError):
            MatchUpdate(score_team_a=80, score_team_b=75, status=MatchStatus.FINISHED)

    def test_match_update_accepts_full_payload(self):
        payload = MatchUpdate(
            match_date=date(2026, 5, 5),
            start_time=time(18, 0),
            end_time=time(19, 0),
            team_a_id=1,
            team_b_id=2,
            score_team_a=80,
            score_team_b=75,
            winner_team_id=1,
            is_draw=False,
            court=None,
            tournament=None,
            status=MatchStatus.FINISHED,
        )

        self.assertEqual(payload.status, MatchStatus.FINISHED)

    def test_match_patch_accepts_partial_payload(self):
        payload = MatchPatch(score_team_a=80, score_team_b=75, status=MatchStatus.FINISHED)

        self.assertEqual(payload.score_team_a, 80)
        self.assertEqual(payload.status, MatchStatus.FINISHED)

    def test_match_patch_rejects_scores_above_limit(self):
        with self.assertRaises(ValidationError):
            MatchPatch(score_team_a=MAX_MATCH_SCORE + 1)


if __name__ == "__main__":
    unittest.main()
