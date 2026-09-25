import unittest
from contextlib import contextmanager
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from core.exceptions import ValidationException
from modules.leagues.domain import LeagueCompetitionType, LeagueRegularSeasonFormat
from modules.leagues.schemas import LeagueEliminationConversion
from modules.leagues.service import LeagueService


class _FakeLeagueRepository:
    def update(self, league, **fields):
        for key, value in fields.items():
            setattr(league, key, value)
        return league


class _FakeMembershipRepository:
    def __init__(self):
        self.team_ids = []

    def replace_team_ids_for_league(self, _league_id, team_ids):
        self.team_ids = list(team_ids)


class _FakeMatchRepository:
    def __init__(self, matches, fail_delete=False):
        self.matches = list(matches)
        self.deleted_ids = []
        self.fail_delete = fail_delete

    def list(self, league_id=None):
        return list(self.matches)

    def delete(self, match):
        if self.fail_delete:
            raise RuntimeError("forced delete failure")
        self.deleted_ids.append(match.id)


class _FakeUnitOfWork:
    def __init__(self):
        self.commits = 0
        self.rollbacks = 0
        self.expired = []

    @contextmanager
    def transaction(self):
        try:
            yield
            self.commits += 1
        except Exception:
            self.rollbacks += 1
            raise

    def expire(self, entity, attribute_names=None):
        self.expired.append((entity, attribute_names))


class _FakePolicy:
    def __init__(self, league):
        self.league = league

    def get_existing_league(self, _league_id):
        return self.league

    def prepare_payload(self, **_kwargs):
        return (
            ["points"],
            [1, 2, 3, 4],
            {
                "competition_type": "ELIMINATION",
                "final_phase_enabled": True,
                "final_phase_preset": "TOP_4_SINGLE_GAME",
                "final_phase_format": "SINGLE_ELIMINATION",
                "final_phase_qualified_teams": 4,
                "final_phase_byes": 0,
                "final_phase_two_legs": False,
                "final_phase_third_place_match": False,
                "final_phase_seeded_home_advantage": True,
                "final_phase_play_in_slots": 0,
                "final_phase_round_best_of": 1,
                "final_phase_final_best_of": 1,
                "final_phase_reseed_each_round": False,
                "final_phase_grand_final_reset": False,
            },
            None,
        )


def _conversion(expected_match_ids=None):
    return LeagueEliminationConversion.model_validate(
        {
            "league": {
                "name": "Liga segura",
                "responsible_name": "Responsable",
                "responsible_email": "responsable@example.com",
                "category": "Basquet",
                "competition_type": "ELIMINATION",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 12, 31),
                "logo_base64": None,
                "team_ids": [1, 2, 3, 4],
                "final_phase_preset": "TOP_4_SINGLE_GAME",
                "final_phase_qualified_teams": 4,
            },
            "ordered_team_ids": [1, 4, 2, 3],
            "expected_match_ids": expected_match_ids or [10, 11],
        }
    )


class LeagueConversionTest(unittest.TestCase):
    def setUp(self):
        self.league = SimpleNamespace(
            id=7,
            competition_type="LEAGUE",
            regular_season_format="SINGLE_ROUND",
            group_stage_config=None,
            bracket_state=None,
        )
        self.matches = [SimpleNamespace(id=10), SimpleNamespace(id=11)]
        self.league_repo = _FakeLeagueRepository()
        self.membership_repo = _FakeMembershipRepository()
        self.match_repo = _FakeMatchRepository(self.matches)
        self.unit_of_work = _FakeUnitOfWork()
        self.policy = _FakePolicy(self.league)
        self.service = LeagueService(
            league_repo=self.league_repo,
            team_repo=SimpleNamespace(),
            league_membership_repo=self.membership_repo,
            match_repo=self.match_repo,
            unit_of_work=self.unit_of_work,
            policy=self.policy,
        )

    @patch("modules.leagues.service.build_bracket_state", return_value=({"size": 4}, []))
    def test_conversion_updates_bracket_and_removes_confirmed_history_in_one_transaction(self, _build):
        converted = self.service.convert_to_single_elimination(7, _conversion())

        self.assertIs(converted, self.league)
        self.assertEqual(self.league.competition_type, "ELIMINATION")
        self.assertEqual(self.league.bracket_state, {"size": 4, "seed_mode": "MANUAL"})
        self.assertEqual(self.membership_repo.team_ids, [1, 2, 3, 4])
        self.assertEqual(self.match_repo.deleted_ids, [10, 11])
        self.assertEqual(self.unit_of_work.commits, 1)
        self.assertEqual(self.unit_of_work.rollbacks, 0)
        self.assertEqual(self.unit_of_work.expired, [(self.league, ["team_memberships"])])

    def test_conversion_rejects_a_stale_match_snapshot_before_writing(self):
        with self.assertRaisesRegex(ValidationException, "partidos de la liga cambiaron"):
            self.service.convert_to_single_elimination(7, _conversion([10, 12]))

        self.assertEqual(self.unit_of_work.commits, 0)
        self.assertEqual(self.unit_of_work.rollbacks, 0)
        self.assertEqual(self.match_repo.deleted_ids, [])
        self.assertEqual(self.membership_repo.team_ids, [])

    @patch("modules.leagues.service.build_bracket_state", return_value=({"size": 4}, []))
    def test_conversion_rolls_back_when_history_deletion_fails(self, _build):
        self.match_repo.fail_delete = True

        with self.assertRaisesRegex(RuntimeError, "forced delete failure"):
            self.service.convert_to_single_elimination(7, _conversion())

        self.assertEqual(self.unit_of_work.commits, 0)
        self.assertEqual(self.unit_of_work.rollbacks, 1)
        self.assertEqual(self.unit_of_work.expired, [])

    def test_regular_season_format_change_with_matches_requires_confirmation(self):
        update = _conversion().league.model_copy(
            update={
                "competition_type": LeagueCompetitionType.LEAGUE,
                "regular_season_format": LeagueRegularSeasonFormat.DOUBLE_ROUND,
                "confirm_regular_season_format_change": False,
            }
        )

        with self.assertRaisesRegex(ValidationException, "Confirma el cambio"):
            self.service.update(7, update)

        self.assertEqual(self.unit_of_work.commits, 0)
        self.assertEqual(self.membership_repo.team_ids, [])

    def test_confirmed_regular_season_format_change_preserves_matches(self):
        update = _conversion().league.model_copy(
            update={
                "competition_type": LeagueCompetitionType.LEAGUE,
                "regular_season_format": LeagueRegularSeasonFormat.DOUBLE_ROUND,
                "confirm_regular_season_format_change": True,
            }
        )

        self.service.update(7, update)

        self.assertEqual(self.league.regular_season_format, "DOUBLE_ROUND")
        self.assertEqual(self.match_repo.deleted_ids, [])
        self.assertEqual(self.unit_of_work.commits, 1)

    def test_group_structure_change_with_matches_is_rejected(self):
        self.league.competition_type = "GROUPS"
        self.league.group_stage_config = {
            "mode": "MANUAL",
            "groups": [
                {"key": "A", "name": "Grupo A", "team_ids": [1, 2]},
                {"key": "B", "name": "Grupo B", "team_ids": [3, 4]},
            ],
            "qualifiers_per_group": 0,
            "best_extra_slots": 0,
            "wildcard_ranking": "WIN_PERCENTAGE",
            "wildcard_tiebreakers": ["AVERAGE_POINT_DIFFERENCE", "AVERAGE_POINTS_FOR"],
        }
        update = _conversion().league.model_copy(update={"competition_type": LeagueCompetitionType.GROUPS})

        with self.assertRaisesRegex(ValidationException, "ya quedaron confirmados"):
            self.service.update(7, update)

        self.assertEqual(self.unit_of_work.commits, 0)

    def test_confirmed_group_distribution_is_rejected_without_matches(self):
        self.league.competition_type = "GROUPS"
        self.league.group_stage_config = {
            "mode": "MANUAL",
            "groups": [
                {"key": "A", "name": "Grupo A", "team_ids": [1, 2]},
                {"key": "B", "name": "Grupo B", "team_ids": [3, 4]},
            ],
            "qualifiers_per_group": 0,
            "best_extra_slots": 0,
            "wildcard_ranking": "WIN_PERCENTAGE",
            "wildcard_tiebreakers": ["AVERAGE_POINT_DIFFERENCE", "AVERAGE_POINTS_FOR"],
        }
        self.match_repo.matches = []
        update = _conversion().league.model_copy(update={"competition_type": LeagueCompetitionType.GROUPS})

        with self.assertRaisesRegex(ValidationException, "ya quedaron confirmados"):
            self.service.update(7, update)

        self.assertEqual(self.unit_of_work.commits, 0)


if __name__ == "__main__":
    unittest.main()
