import unittest
from types import SimpleNamespace

from core.exceptions import AppException
from modules.scoreboard.policy import ScoreboardPolicy


class ScoreboardPolicyTest(unittest.TestCase):
    def test_draft_elimination_match_cannot_open_scoreboard(self):
        league = SimpleNamespace(
            competition_type="ELIMINATION",
            bracket_state=None,
            status="Sin empezar",
        )
        match = SimpleNamespace(status="scheduled", bracket_round=None, league=league)

        with self.assertRaisesRegex(AppException, "aun es un borrador"):
            ScoreboardPolicy.ensure_scoreboard_open(match)

    def test_finished_match_cannot_change_through_scoreboard(self):
        match = SimpleNamespace(status="finished", bracket_round=1, league=None)

        with self.assertRaisesRegex(AppException, "ya esta finalizado"):
            ScoreboardPolicy.ensure_scoreboard_open(match)

    def test_open_official_bracket_match_accepts_scoreboard(self):
        league = SimpleNamespace(
            competition_type="ELIMINATION",
            bracket_state={"nodes": {}},
            status="En curso",
        )
        match = SimpleNamespace(status="scheduled", bracket_round=1, league=league, competition_stage="FINAL_PHASE")

        ScoreboardPolicy.ensure_scoreboard_open(match)

    def test_group_match_cannot_reopen_scoreboard_after_bracket_generation(self):
        league = SimpleNamespace(
            competition_type="GROUPS",
            bracket_state={"nodes": {}},
            status="En curso",
        )
        match = SimpleNamespace(status="scheduled", bracket_round=None, league=league, competition_stage="GROUP_STAGE")

        with self.assertRaisesRegex(AppException, "fase de grupos esta cerrada"):
            ScoreboardPolicy.ensure_scoreboard_open(match)


if __name__ == "__main__":
    unittest.main()
