import unittest
from datetime import date
from types import SimpleNamespace

from core.exceptions import AppException
from modules.leagues.domain import (
    LeagueCompetitionType,
    LeagueFinalPhaseFormat,
    LeagueFinalPhasePreset,
    LeagueGroupStageMode,
    LeagueGroupWildcardRankingMetric,
    resolve_group_stage_config,
    resolve_final_phase_settings,
    validate_league_schedule,
)


class LeagueRulesTest(unittest.TestCase):
    @staticmethod
    def _custom_payload(**overrides):
        payload = {
            "enabled": True,
            "preset": LeagueFinalPhasePreset.CUSTOM,
            "qualified_teams": 8,
            "byes": 0,
            "format": LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
            "two_legs": False,
            "third_place_match": False,
            "seeded_home_advantage": True,
            "play_in_slots": 0,
            "round_best_of": 1,
            "final_best_of": 1,
            "reseed_each_round": False,
            "grand_final_reset": False,
            "current_team_count": 0,
        }
        payload.update(overrides)
        return payload

    def test_validate_league_schedule_rejects_invalid_range(self):
        with self.assertRaisesRegex(AppException, "fecha de inicio"):
            validate_league_schedule(date(2026, 5, 20), date(2026, 5, 19))

    def test_resolve_final_phase_settings_returns_defaults_when_disabled(self):
        result = resolve_final_phase_settings(**self._custom_payload(enabled=False, qualified_teams=16, two_legs=True))

        self.assertFalse(result.enabled)
        self.assertEqual(result.preset, LeagueFinalPhasePreset.TOP_8_SINGLE_GAME)
        self.assertEqual(result.format, LeagueFinalPhaseFormat.SINGLE_ELIMINATION)
        self.assertEqual(result.qualified_teams, 8)
        self.assertFalse(result.two_legs)

    def test_resolve_final_phase_settings_uses_preset_values(self):
        result = resolve_final_phase_settings(
            enabled=True,
            preset=LeagueFinalPhasePreset.TOP_8_HOME_AWAY,
            format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION,
            qualified_teams=4,
            byes=0,
            two_legs=False,
            third_place_match=True,
            seeded_home_advantage=False,
            play_in_slots=2,
            round_best_of=5,
            final_best_of=7,
            reseed_each_round=True,
            grand_final_reset=True,
            current_team_count=8,
        )

        self.assertTrue(result.enabled)
        self.assertEqual(result.preset, LeagueFinalPhasePreset.TOP_8_HOME_AWAY)
        self.assertEqual(result.format, LeagueFinalPhaseFormat.SINGLE_ELIMINATION)
        self.assertEqual(result.qualified_teams, 8)
        self.assertEqual(result.byes, 0)
        self.assertFalse(result.two_legs)
        self.assertFalse(result.third_place_match)
        self.assertTrue(result.seeded_home_advantage)
        self.assertEqual(result.play_in_slots, 0)
        self.assertEqual(result.round_best_of, 1)
        self.assertEqual(result.final_best_of, 1)
        self.assertFalse(result.reseed_each_round)
        self.assertFalse(result.grand_final_reset)

    def test_resolve_final_phase_settings_rejects_when_preset_needs_more_teams(self):
        with self.assertRaisesRegex(AppException, "mas equipos"):
            resolve_final_phase_settings(
                enabled=True,
                preset=LeagueFinalPhasePreset.TOP_8_SINGLE_GAME,
                format=LeagueFinalPhaseFormat.SINGLE_ELIMINATION,
                qualified_teams=8,
                byes=0,
                two_legs=False,
                third_place_match=False,
                seeded_home_advantage=True,
                play_in_slots=0,
                round_best_of=1,
                final_best_of=1,
                reseed_each_round=False,
                grand_final_reset=False,
                current_team_count=6,
            )

    def test_resolve_final_phase_settings_accepts_custom_odd_teams_with_required_bye(self):
        result = resolve_final_phase_settings(
            **self._custom_payload(qualified_teams=7, byes=1, current_team_count=8)
        )

        self.assertEqual(result.qualified_teams, 7)
        self.assertEqual(result.byes, 1)

    def test_resolve_final_phase_settings_rejects_invalid_play_in_slots(self):
        with self.assertRaisesRegex(AppException, "play-in requiere al menos 2"):
            resolve_final_phase_settings(
                **self._custom_payload(
                    format=LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET,
                    play_in_slots=1,
                    qualified_teams=10,
                )
            )

    def test_resolve_final_phase_settings_rejects_odd_play_in_slots(self):
        with self.assertRaisesRegex(AppException, "cantidad par"):
            resolve_final_phase_settings(
                **self._custom_payload(
                    format=LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET,
                    qualified_teams=10,
                    byes=7,
                    play_in_slots=3,
                )
            )

    def test_resolve_final_phase_settings_rejects_play_in_byes_mismatch(self):
        with self.assertRaisesRegex(AppException, "avanzan directo"):
            resolve_final_phase_settings(
                **self._custom_payload(
                    format=LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET,
                    qualified_teams=10,
                    byes=5,
                    play_in_slots=4,
                )
            )

    def test_resolve_final_phase_settings_rejects_play_in_that_cannot_close_main_bracket(self):
        with self.assertRaisesRegex(AppException, "potencia de 2"):
            resolve_final_phase_settings(
                **self._custom_payload(
                    format=LeagueFinalPhaseFormat.PLAY_IN_PLUS_BRACKET,
                    qualified_teams=10,
                    byes=8,
                    play_in_slots=2,
                )
            )

    def test_resolve_final_phase_settings_rejects_play_in_slots_without_play_in_format(self):
        with self.assertRaisesRegex(AppException, "Solo el formato play-in"):
            resolve_final_phase_settings(**self._custom_payload(play_in_slots=2))

    def test_resolve_final_phase_settings_rejects_single_elimination_with_odd_first_round(self):
        with self.assertRaisesRegex(AppException, "primera ronda"):
            resolve_final_phase_settings(**self._custom_payload(byes=1, qualified_teams=8))

    def test_resolve_final_phase_settings_rejects_double_elimination_with_byes(self):
        with self.assertRaisesRegex(AppException, "no permite byes"):
            resolve_final_phase_settings(
                **self._custom_payload(
                    format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION,
                    qualified_teams=8,
                    byes=2,
                )
            )

    def test_resolve_final_phase_settings_rejects_double_elimination_with_non_power_of_two(self):
        with self.assertRaisesRegex(AppException, "potencia de 2"):
            resolve_final_phase_settings(
                **self._custom_payload(
                    format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION,
                    qualified_teams=12,
                    byes=0,
                )
            )

    def test_resolve_final_phase_settings_rejects_two_legs_in_elimination(self):
        with self.assertRaisesRegex(AppException, "fase regular"):
            resolve_final_phase_settings(
                **self._custom_payload(format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION, two_legs=True)
            )

    def test_resolve_final_phase_settings_accepts_custom_advanced_values(self):
        result = resolve_final_phase_settings(
            **self._custom_payload(
                format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION,
                qualified_teams=16,
                byes=0,
                round_best_of=3,
                final_best_of=5,
                reseed_each_round=False,
                grand_final_reset=True,
                third_place_match=False,
                seeded_home_advantage=False,
                current_team_count=18,
            )
        )

        self.assertEqual(result.preset, LeagueFinalPhasePreset.CUSTOM)
        self.assertEqual(result.format, LeagueFinalPhaseFormat.DOUBLE_ELIMINATION)
        self.assertEqual(result.qualified_teams, 16)
        self.assertEqual(result.byes, 0)
        self.assertEqual(result.round_best_of, 3)
        self.assertEqual(result.final_best_of, 5)
        self.assertFalse(result.reseed_each_round)
        self.assertTrue(result.grand_final_reset)
        self.assertFalse(result.third_place_match)
        self.assertFalse(result.seeded_home_advantage)

    def test_resolve_final_phase_settings_rejects_double_elimination_reseeding(self):
        with self.assertRaisesRegex(AppException, "cruces fijos"):
            resolve_final_phase_settings(
                **self._custom_payload(
                    format=LeagueFinalPhaseFormat.DOUBLE_ELIMINATION,
                    reseed_each_round=True,
                )
            )

    @staticmethod
    def _group_stage_config(*, mode=LeagueGroupStageMode.UNIFORM, groups=None, qualifiers_per_group=0, best_extra_slots=0):
        return SimpleNamespace(
            mode=mode,
            groups=groups
            or [
                SimpleNamespace(key="A", name="Grupo A", team_ids=[1, 2, 3, 4]),
                SimpleNamespace(key="B", name="Grupo B", team_ids=[5, 6, 7, 8]),
            ],
            qualifiers_per_group=qualifiers_per_group,
            best_extra_slots=best_extra_slots,
            wildcard_ranking=LeagueGroupWildcardRankingMetric.WIN_PERCENTAGE,
            wildcard_tiebreakers=[
                LeagueGroupWildcardRankingMetric.AVERAGE_POINT_DIFFERENCE,
                LeagueGroupWildcardRankingMetric.AVERAGE_POINTS_FOR,
            ],
        )

    def test_resolve_group_stage_config_accepts_uniform_groups_with_final_phase(self):
        result = resolve_group_stage_config(
            competition_type=LeagueCompetitionType.GROUPS,
            group_stage_config=self._group_stage_config(qualifiers_per_group=2),
            registered_team_ids=[1, 2, 3, 4, 5, 6, 7, 8],
            final_phase_enabled=True,
            final_phase_qualified_teams=4,
        )

        self.assertEqual(result["mode"], LeagueGroupStageMode.UNIFORM.value)
        self.assertEqual(len(result["groups"]), 2)
        self.assertEqual(result["qualifiers_per_group"], 2)
        self.assertEqual(result["best_extra_slots"], 0)

    def test_resolve_group_stage_config_allows_registered_teams_before_group_setup(self):
        result = resolve_group_stage_config(
            competition_type=LeagueCompetitionType.GROUPS,
            group_stage_config=None,
            registered_team_ids=[1, 2, 3, 4],
            final_phase_enabled=False,
            final_phase_qualified_teams=0,
        )

        self.assertIsNone(result)

    def test_resolve_group_stage_config_rejects_final_phase_before_group_setup(self):
        with self.assertRaisesRegex(AppException, "Configura los grupos"):
            resolve_group_stage_config(
                competition_type=LeagueCompetitionType.GROUPS,
                group_stage_config=None,
                registered_team_ids=[1, 2, 3, 4],
                final_phase_enabled=True,
                final_phase_qualified_teams=2,
            )

    def test_resolve_group_stage_config_accepts_mixed_groups_with_best_extras(self):
        result = resolve_group_stage_config(
            competition_type=LeagueCompetitionType.GROUPS,
            group_stage_config=self._group_stage_config(
                mode=LeagueGroupStageMode.MANUAL,
                groups=[
                    SimpleNamespace(key="A", name="Grupo A", team_ids=[1, 2, 3, 4]),
                    SimpleNamespace(key="B", name="Grupo B", team_ids=[5, 6, 7]),
                    SimpleNamespace(key="C", name="Grupo C", team_ids=[8, 9]),
                ],
                qualifiers_per_group=1,
                best_extra_slots=1,
            ),
            registered_team_ids=[1, 2, 3, 4, 5, 6, 7, 8, 9],
            final_phase_enabled=True,
            final_phase_qualified_teams=4,
        )

        self.assertEqual(result["mode"], LeagueGroupStageMode.MANUAL.value)
        self.assertEqual(result["best_extra_slots"], 1)
        self.assertEqual(result["wildcard_ranking"], LeagueGroupWildcardRankingMetric.WIN_PERCENTAGE.value)

    def test_resolve_group_stage_config_rejects_duplicate_team_across_groups(self):
        with self.assertRaisesRegex(AppException, "mas de un grupo"):
            resolve_group_stage_config(
                competition_type=LeagueCompetitionType.GROUPS,
                group_stage_config=self._group_stage_config(
                    mode=LeagueGroupStageMode.MANUAL,
                    groups=[
                        SimpleNamespace(key="A", name="Grupo A", team_ids=[1, 2, 3]),
                        SimpleNamespace(key="B", name="Grupo B", team_ids=[3, 4, 5]),
                    ],
                    qualifiers_per_group=1,
                ),
                registered_team_ids=[1, 2, 3, 4, 5],
                final_phase_enabled=True,
                final_phase_qualified_teams=2,
            )

    def test_resolve_group_stage_config_rejects_mismatched_final_phase_slots(self):
        with self.assertRaisesRegex(AppException, "coincidir con los equipos clasificados"):
            resolve_group_stage_config(
                competition_type=LeagueCompetitionType.GROUPS,
                group_stage_config=self._group_stage_config(qualifiers_per_group=2),
                registered_team_ids=[1, 2, 3, 4, 5, 6, 7, 8],
                final_phase_enabled=True,
                final_phase_qualified_teams=8,
            )


if __name__ == "__main__":
    unittest.main()
