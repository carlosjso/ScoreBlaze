import unittest
from contextlib import contextmanager
from types import SimpleNamespace
from unittest.mock import patch

from core.exceptions import ValidationException
from modules.leagues.schemas import LeagueBracketGenerate
from modules.leagues.service import LeagueService


class _LeagueRepository:
    @staticmethod
    def update(league, **fields):
        for key, value in fields.items():
            setattr(league, key, value)
        return league


class _TeamRepository:
    @staticmethod
    def get_many_by_ids(team_ids):
        return [SimpleNamespace(id=team_id, name=f"Equipo {team_id}") for team_id in team_ids]


class _MatchRepository:
    def __init__(self):
        self.matches = []

    def list(self, league_id=None):
        return self.matches


class _Policy:
    def __init__(self, league):
        self.league = league

    def get_existing_league(self, _league_id):
        return self.league

    @staticmethod
    def validate_final_phase_for_team_assignments(**_kwargs):
        return None


class _UnitOfWork:
    @contextmanager
    def transaction(self):
        yield


class LeaguePlayoffGenerationTest(unittest.TestCase):
    def setUp(self):
        self.league = SimpleNamespace(
            id=9,
            status="En curso",
            competition_type="LEAGUE",
            final_phase_enabled=True,
            final_phase_seed_mode="STANDINGS",
            final_phase_qualified_teams=2,
            final_phase_format="SINGLE_ELIMINATION",
            final_phase_byes=0,
            regular_season_format="SINGLE_ROUND",
            standings_tiebreakers=["HEAD_TO_HEAD", "POINT_DIFFERENCE", "POINTS_FOR"],
            bracket_state=None,
            team_ids=[1, 2, 3, 4],
            group_stage_config=None,
        )
        self.match_repo = _MatchRepository()
        self.service = LeagueService(
            league_repo=_LeagueRepository(),
            team_repo=_TeamRepository(),
            league_membership_repo=SimpleNamespace(),
            match_repo=self.match_repo,
            unit_of_work=_UnitOfWork(),
            policy=_Policy(self.league),
        )

    def _configure_groups(self):
        self.league.competition_type = "GROUPS"
        self.league.final_phase_seed_mode = "STANDINGS"
        self.league.group_stage_config = {
            "mode": "UNIFORM",
            "groups": [
                {"key": "A", "name": "Grupo A", "team_ids": [1, 2]},
                {"key": "B", "name": "Grupo B", "team_ids": [3, 4]},
            ],
            "qualifiers_per_group": 1,
            "best_extra_slots": 0,
            "wildcard_ranking": "WIN_PERCENTAGE",
            "wildcard_tiebreakers": ["AVERAGE_POINT_DIFFERENCE", "AVERAGE_POINTS_FOR"],
        }

    @staticmethod
    def _group_match(match_id, group_key, team_a_id, team_b_id, score_a, score_b):
        return SimpleNamespace(
            id=match_id,
            competition_stage="GROUP_STAGE",
            group_stage_group_key=group_key,
            team_a_id=team_a_id,
            team_b_id=team_b_id,
            score_team_a=score_a,
            score_team_b=score_b,
            winner_team_id=team_a_id if score_a > score_b else team_b_id,
            is_draw=False,
            status="finished",
        )

    def test_incomplete_regular_season_requires_explicit_confirmation(self):
        data = LeagueBracketGenerate(ordered_team_ids=[1, 2], seed_mode="STANDINGS")

        with self.assertRaisesRegex(ValidationException, "Confirma el cierre anticipado"):
            self.service.generate_bracket(9, data)

    def test_only_current_top_can_enter_the_bracket(self):
        data = LeagueBracketGenerate(
            ordered_team_ids=[1, 3],
            seed_mode="STANDINGS",
            confirm_incomplete_regular_season=True,
        )

        with self.assertRaisesRegex(ValidationException, "dentro del Top"):
            self.service.generate_bracket(9, data)

    @patch("modules.leagues.service.build_bracket_state", return_value=({"champion_team_id": None}, []))
    def test_random_mode_changes_order_but_not_the_qualified_teams(self, _build):
        self.league.final_phase_seed_mode = "RANDOM"
        data = LeagueBracketGenerate(
            ordered_team_ids=[2, 1],
            seed_mode="RANDOM",
            confirm_incomplete_regular_season=True,
        )

        self.service.generate_bracket(9, data)

        self.assertEqual(self.league.bracket_state["seed_mode"], "RANDOM")

    def test_incomplete_group_stage_requires_explicit_confirmation(self):
        self._configure_groups()
        data = LeagueBracketGenerate(ordered_team_ids=[1, 3], seed_mode="STANDINGS")

        with self.assertRaisesRegex(ValidationException, "fase de grupos"):
            self.service.generate_bracket(9, data)

    def test_group_bracket_rejects_registered_teams_that_did_not_qualify(self):
        self._configure_groups()
        self.match_repo.matches = [
            self._group_match(1, "A", 1, 2, 80, 60),
            self._group_match(2, "B", 3, 4, 55, 70),
        ]
        data = LeagueBracketGenerate(ordered_team_ids=[2, 3], seed_mode="STANDINGS")

        with self.assertRaisesRegex(ValidationException, "clasificados oficiales"):
            self.service.generate_bracket(9, data)

    @patch("modules.leagues.service.build_bracket_state", return_value=({"champion_team_id": None}, []))
    def test_group_bracket_accepts_the_official_group_winners(self, _build):
        self._configure_groups()
        self.match_repo.matches = [
            self._group_match(1, "A", 1, 2, 80, 60),
            self._group_match(2, "B", 3, 4, 55, 70),
        ]
        data = LeagueBracketGenerate(ordered_team_ids=[1, 4], seed_mode="STANDINGS")

        self.service.generate_bracket(9, data)

        self.assertEqual(self.league.bracket_state["seed_mode"], "STANDINGS")


if __name__ == "__main__":
    unittest.main()
