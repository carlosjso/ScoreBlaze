import unittest
from datetime import date

from core.exceptions import AppException
from modules.leagues.domain import (
    LeagueFinalPhaseFormat,
    LeagueFinalPhasePreset,
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
        self.assertTrue(result.two_legs)
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

    def test_resolve_final_phase_settings_rejects_custom_odd_teams(self):
        with self.assertRaisesRegex(AppException, "numero par"):
            resolve_final_phase_settings(**self._custom_payload(qualified_teams=7, current_team_count=8))

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

    def test_resolve_final_phase_settings_rejects_double_elimination_with_two_legs(self):
        with self.assertRaisesRegex(AppException, "doble eliminacion"):
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
                reseed_each_round=True,
                grand_final_reset=True,
                third_place_match=True,
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
        self.assertTrue(result.reseed_each_round)
        self.assertTrue(result.grand_final_reset)
        self.assertTrue(result.third_place_match)
        self.assertFalse(result.seeded_home_advantage)


if __name__ == "__main__":
    unittest.main()
