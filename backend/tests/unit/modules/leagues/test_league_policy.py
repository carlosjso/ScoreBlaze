import unittest
from datetime import date
from types import SimpleNamespace

from core.exceptions import AppException
from modules.leagues.domain import (
    LeagueCompetitionType,
    LeagueFinalPhaseFormat,
    LeagueFinalPhasePreset,
)
from modules.leagues.policy import LeaguePolicy


class _LeagueRepository:
    def get_by_name(self, _name):
        return None


class _TeamRepository:
    def get_many_by_ids(self, team_ids):
        return [SimpleNamespace(id=team_id) for team_id in team_ids]


class LeaguePolicyTest(unittest.TestCase):
    def setUp(self):
        self.policy = LeaguePolicy(_LeagueRepository(), _TeamRepository())

    def _prepare_elimination(self, **overrides):
        payload = {
            "name": "Copa",
            "start_date": date(2026, 1, 1),
            "end_date": date(2026, 1, 31),
            "tracked_stats": [],
            "team_ids": [1, 2, 3, 4, 5, 6, 7, 8],
            "competition_type": LeagueCompetitionType.ELIMINATION,
            "final_phase_enabled": True,
            "final_phase_preset": LeagueFinalPhasePreset.TOP_8_SINGLE_GAME,
            "final_phase_qualified_teams": 8,
            "final_phase_byes": 0,
            "final_phase_format": LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
            "final_phase_two_legs": False,
            "final_phase_third_place_match": False,
            "final_phase_seeded_home_advantage": True,
            "final_phase_play_in_slots": 0,
            "final_phase_round_best_of": 1,
            "final_phase_final_best_of": 1,
            "final_phase_reseed_each_round": False,
            "final_phase_grand_final_reset": False,
            "group_stage_config": None,
        }
        payload.update(overrides)
        return self.policy.prepare_payload(**payload)

    def test_direct_elimination_uses_every_registered_team(self):
        _, team_ids, settings, _ = self._prepare_elimination()

        self.assertEqual(team_ids, [1, 2, 3, 4, 5, 6, 7, 8])
        self.assertEqual(settings["final_phase_preset"], "CUSTOM")
        self.assertEqual(settings["final_phase_qualified_teams"], 8)
        self.assertEqual(settings["final_phase_byes"], 0)

    def test_direct_elimination_discards_advanced_bracket_variants(self):
        _, _, settings, _ = self._prepare_elimination(
            final_phase_format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION,
            final_phase_qualified_teams=8,
            final_phase_final_best_of=3,
            final_phase_seeded_home_advantage=True,
            final_phase_reseed_each_round=True,
            final_phase_grand_final_reset=True,
        )

        self.assertEqual(settings["final_phase_format"], "SINGLE_ELIMINATION")
        self.assertFalse(settings["final_phase_seeded_home_advantage"])
        self.assertFalse(settings["final_phase_reseed_each_round"])
        self.assertFalse(settings["final_phase_grand_final_reset"])
        self.assertEqual(settings["final_phase_final_best_of"], 3)

    def test_team_assignment_rejects_non_power_of_two_direct_settings(self):
        league = SimpleNamespace(
            competition_type="ELIMINATION",
            final_phase_enabled=True,
            final_phase_preset="TOP_8_SINGLE_GAME",
            final_phase_qualified_teams=8,
            final_phase_byes=0,
            final_phase_format="SINGLE_ELIMINATION",
            final_phase_two_legs=False,
            final_phase_third_place_match=False,
            final_phase_seeded_home_advantage=True,
            final_phase_play_in_slots=0,
            final_phase_round_best_of=1,
            final_phase_final_best_of=1,
            final_phase_reseed_each_round=False,
            final_phase_grand_final_reset=False,
            group_stage_config=None,
        )

        with self.assertRaisesRegex(AppException, "2, 4, 8, 16 o 32"):
            self.policy.validate_final_phase_for_team_assignments(
                league=league,
                team_ids=[1, 2, 3, 4, 5],
            )

    def test_team_assignment_removes_seed_extras_from_direct_elimination(self):
        league = SimpleNamespace(
            competition_type="ELIMINATION",
            final_phase_enabled=True,
            final_phase_preset="CUSTOM",
            final_phase_qualified_teams=8,
            final_phase_byes=0,
            final_phase_format="SINGLE_ELIMINATION",
            final_phase_two_legs=False,
            final_phase_third_place_match=False,
            final_phase_seeded_home_advantage=True,
            final_phase_play_in_slots=0,
            final_phase_round_best_of=3,
            final_phase_final_best_of=5,
            final_phase_reseed_each_round=True,
            final_phase_grand_final_reset=False,
            final_phase_seed_mode="MANUAL",
            group_stage_config=None,
        )

        settings = self.policy.validate_final_phase_for_team_assignments(
            league=league,
            team_ids=[1, 2, 3, 4, 5, 6, 7, 8],
        )

        self.assertIsNotNone(settings)
        self.assertFalse(settings["final_phase_seeded_home_advantage"])
        self.assertFalse(settings["final_phase_reseed_each_round"])

    def test_first_playoff_teams_reduce_an_oversized_default_cut(self):
        league = SimpleNamespace(
            competition_type="LEAGUE",
            final_phase_enabled=True,
            final_phase_preset="TOP_8_SINGLE_GAME",
            final_phase_qualified_teams=8,
            final_phase_byes=0,
            final_phase_format="SINGLE_ELIMINATION",
            final_phase_two_legs=False,
            final_phase_third_place_match=False,
            final_phase_seeded_home_advantage=True,
            final_phase_play_in_slots=0,
            final_phase_round_best_of=1,
            final_phase_final_best_of=1,
            final_phase_reseed_each_round=False,
            final_phase_grand_final_reset=False,
            group_stage_config=None,
        )

        settings = self.policy.validate_final_phase_for_team_assignments(
            league=league,
            team_ids=[1, 2, 3, 4, 5, 6],
        )

        self.assertIsNotNone(settings)
        self.assertEqual(settings["final_phase_preset"], "CUSTOM")
        self.assertEqual(settings["final_phase_qualified_teams"], 6)
        self.assertEqual(settings["final_phase_byes"], 2)


if __name__ == "__main__":
    unittest.main()
