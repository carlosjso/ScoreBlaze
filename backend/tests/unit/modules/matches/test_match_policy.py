import unittest
from datetime import date
from types import SimpleNamespace

from core.exceptions import AppException
from modules.matches.domain import MatchCompetitionStage
from modules.matches.policy import MatchPolicy
from modules.matches.service import MatchService


class _FakeMatchRepository:
    def __init__(self, matches=None):
        self.matches = matches or []

    @staticmethod
    def get_existing_team_ids(team_ids: list[int]) -> set[int]:
        return set(team_ids)

    @staticmethod
    def get(match_id: int):
        return None

    def list(self, league_id=None):
        return self.matches


class _FakeLeagueRepository:
    def __init__(self, leagues_by_id: dict[int, object]):
        self.leagues_by_id = leagues_by_id

    def get(self, league_id: int):
        return self.leagues_by_id.get(league_id)


class MatchPolicyTest(unittest.TestCase):
    @staticmethod
    def _build_league(*, regular_season_format="SINGLE_ROUND", bracket_state=None):
        return SimpleNamespace(
            id=8,
            competition_type="LEAGUE",
            final_phase_enabled=False,
            regular_season_format=regular_season_format,
            bracket_state=bracket_state,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            team_memberships=[SimpleNamespace(team_id=1), SimpleNamespace(team_id=2)],
        )

    @staticmethod
    def _build_group_league(*, final_phase_enabled: bool = True, regular_season_format="SINGLE_ROUND", bracket_state=None):
        return SimpleNamespace(
            id=7,
            competition_type="GROUPS",
            final_phase_enabled=final_phase_enabled,
            regular_season_format=regular_season_format,
            bracket_state=bracket_state,
            status="En curso",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            group_stage_config={
                "mode": "MANUAL",
                "groups": [
                    {"key": "A", "name": "Grupo A", "team_ids": [1, 2, 3]},
                    {"key": "B", "name": "Grupo B", "team_ids": [4, 5, 6]},
                ],
            },
            team_memberships=[
                SimpleNamespace(team_id=1),
                SimpleNamespace(team_id=2),
                SimpleNamespace(team_id=3),
                SimpleNamespace(team_id=4),
                SimpleNamespace(team_id=5),
                SimpleNamespace(team_id=6),
            ],
        )

    @staticmethod
    def _build_elimination(*, bracket_state=None):
        return SimpleNamespace(
            id=9,
            competition_type="ELIMINATION",
            final_phase_format="SINGLE_ELIMINATION",
            final_phase_play_in_slots=0,
            bracket_state=bracket_state,
            status="Sin empezar",
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            team_memberships=[SimpleNamespace(team_id=team_id) for team_id in range(1, 7)],
        )

    @staticmethod
    def _draft_data(team_a_id=1, team_b_id=2):
        return SimpleNamespace(
            league_id=9,
            team_a_id=team_a_id,
            team_b_id=team_b_id,
            match_date=date(2026, 5, 1),
            status=SimpleNamespace(value="scheduled"),
            score_team_a=None,
            score_team_b=None,
            winner_team_id=None,
            bracket_round=None,
            bracket_slot=None,
            bracket_size=None,
            bracket_game=None,
            bracket_series_mode=None,
            bracket_series_best_of=None,
            bracket_path=None,
        )

    def test_resolve_competition_context_infers_group_stage_and_group_key(self):
        policy = MatchPolicy(
            match_repo=_FakeMatchRepository(),
            league_repo=_FakeLeagueRepository({7: self._build_group_league()}),
        )

        stage, group_key = policy.resolve_competition_context(
            league_id=7,
            team_a_id=1,
            team_b_id=3,
            competition_stage=None,
            group_stage_group_key=None,
        )

        self.assertEqual(stage, MatchCompetitionStage.GROUP_STAGE)
        self.assertEqual(group_key, "A")

    def test_resolve_competition_context_rejects_final_phase_when_group_competition_has_no_bracket(self):
        policy = MatchPolicy(
            match_repo=_FakeMatchRepository(),
            league_repo=_FakeLeagueRepository({7: self._build_group_league(final_phase_enabled=False)}),
        )

        with self.assertRaisesRegex(AppException, "no tiene fase final habilitada"):
            policy.resolve_competition_context(
                league_id=7,
                team_a_id=1,
                team_b_id=2,
                competition_stage=MatchCompetitionStage.FINAL_PHASE,
                group_stage_group_key=None,
            )

    def test_resolve_competition_context_rejects_group_match_with_cross_group_teams(self):
        policy = MatchPolicy(
            match_repo=_FakeMatchRepository(),
            league_repo=_FakeLeagueRepository({7: self._build_group_league()}),
        )

        with self.assertRaisesRegex(AppException, "mismo grupo"):
            policy.resolve_competition_context(
                league_id=7,
                team_a_id=1,
                team_b_id=4,
                competition_stage=MatchCompetitionStage.GROUP_STAGE,
                group_stage_group_key="A",
            )

    def test_single_round_rejects_a_second_match_for_the_same_pair(self):
        match_repo = _FakeMatchRepository([
            SimpleNamespace(id=1, team_a_id=1, team_b_id=2, competition_stage="REGULAR_SEASON"),
        ])
        policy = MatchPolicy(match_repo=match_repo, league_repo=_FakeLeagueRepository({8: self._build_league()}))
        data = SimpleNamespace(league_id=8, team_a_id=2, team_b_id=1, match_date=date(2026, 5, 1))

        with self.assertRaisesRegex(AppException, "limite permitido"):
            policy.validate_league_schedule_rules(data, MatchCompetitionStage.REGULAR_SEASON, None)

    def test_double_round_accepts_a_second_match_for_the_same_pair(self):
        match_repo = _FakeMatchRepository([
            SimpleNamespace(id=1, team_a_id=1, team_b_id=2, competition_stage="REGULAR_SEASON"),
        ])
        policy = MatchPolicy(
            match_repo=match_repo,
            league_repo=_FakeLeagueRepository({8: self._build_league(regular_season_format="DOUBLE_ROUND")}),
        )
        data = SimpleNamespace(league_id=8, team_a_id=2, team_b_id=1, match_date=date(2026, 5, 1))

        policy.validate_league_schedule_rules(data, MatchCompetitionStage.REGULAR_SEASON, None)

    def test_double_round_requires_reversed_team_order_for_the_second_match(self):
        match_repo = _FakeMatchRepository([
            SimpleNamespace(id=1, team_a_id=1, team_b_id=2, competition_stage="REGULAR_SEASON"),
        ])
        policy = MatchPolicy(
            match_repo=match_repo,
            league_repo=_FakeLeagueRepository({8: self._build_league(regular_season_format="DOUBLE_ROUND")}),
        )
        data = SimpleNamespace(league_id=8, team_a_id=1, team_b_id=2, match_date=date(2026, 5, 1))

        with self.assertRaisesRegex(AppException, "invertir el orden"):
            policy.validate_league_schedule_rules(data, MatchCompetitionStage.REGULAR_SEASON, None)

    def test_league_match_must_be_inside_the_competition_dates(self):
        policy = MatchPolicy(match_repo=_FakeMatchRepository(), league_repo=_FakeLeagueRepository({8: self._build_league()}))
        data = SimpleNamespace(league_id=8, team_a_id=1, team_b_id=2, match_date=date(2027, 1, 1))

        with self.assertRaisesRegex(AppException, "dentro del periodo"):
            policy.validate_league_schedule_rules(data, MatchCompetitionStage.REGULAR_SEASON, None)

    def test_regular_season_is_locked_after_bracket_generation(self):
        policy = MatchPolicy(
            match_repo=_FakeMatchRepository(),
            league_repo=_FakeLeagueRepository({8: self._build_league(bracket_state={"ordered_team_ids": [1, 2]})}),
        )
        data = SimpleNamespace(league_id=8, team_a_id=1, team_b_id=2, match_date=date(2026, 5, 1))

        with self.assertRaisesRegex(AppException, "fase regular esta cerrada"):
            policy.validate_league_schedule_rules(data, MatchCompetitionStage.REGULAR_SEASON, None)

    def test_group_stage_rejects_a_second_match_in_single_round(self):
        match_repo = _FakeMatchRepository([
            SimpleNamespace(id=1, team_a_id=1, team_b_id=2, competition_stage="GROUP_STAGE", group_stage_group_key="A"),
        ])
        policy = MatchPolicy(match_repo=match_repo, league_repo=_FakeLeagueRepository({7: self._build_group_league()}))
        data = SimpleNamespace(league_id=7, team_a_id=2, team_b_id=1, match_date=date(2026, 5, 1))

        with self.assertRaisesRegex(AppException, "limite permitido"):
            policy.validate_league_schedule_rules(data, MatchCompetitionStage.GROUP_STAGE, "A")

    def test_group_stage_is_locked_after_bracket_generation(self):
        policy = MatchPolicy(
            match_repo=_FakeMatchRepository(),
            league_repo=_FakeLeagueRepository({7: self._build_group_league(bracket_state={"nodes": {}})}),
        )
        data = SimpleNamespace(league_id=7, team_a_id=1, team_b_id=2, match_date=date(2026, 5, 1))

        with self.assertRaisesRegex(AppException, "fase de grupos esta cerrada"):
            policy.validate_league_schedule_rules(data, MatchCompetitionStage.GROUP_STAGE, "A")

    def test_finished_basketball_match_cannot_end_tied(self):
        data = SimpleNamespace(status=SimpleNamespace(value="finished"))
        result = SimpleNamespace(is_draw=True, winner_team_id=None)

        with self.assertRaisesRegex(AppException, "no puede terminar empatado"):
            MatchPolicy.validate_competition_result(data, result, MatchCompetitionStage.REGULAR_SEASON)

    def test_elimination_draft_rejects_a_team_used_in_another_pairing(self):
        match_repo = _FakeMatchRepository([
            SimpleNamespace(id=1, team_a_id=1, team_b_id=2, competition_stage="FINAL_PHASE", bracket_round=None),
        ])
        policy = MatchPolicy(match_repo=match_repo, league_repo=_FakeLeagueRepository({9: self._build_elimination()}))

        with self.assertRaisesRegex(AppException, "solo puede aparecer"):
            policy.validate_league_schedule_rules(
                self._draft_data(1, 3),
                MatchCompetitionStage.FINAL_PHASE,
                None,
            )

    def test_elimination_rejects_new_matches_after_bracket_is_closed(self):
        policy = MatchPolicy(
            match_repo=_FakeMatchRepository(),
            league_repo=_FakeLeagueRepository({9: self._build_elimination(bracket_state={"nodes": {}})}),
        )

        with self.assertRaisesRegex(AppException, "llave ya esta cerrada"):
            policy.validate_league_schedule_rules(
                self._draft_data(),
                MatchCompetitionStage.FINAL_PHASE,
                None,
            )

    def test_closed_elimination_still_allows_updating_an_official_match(self):
        policy = MatchPolicy(
            match_repo=_FakeMatchRepository(),
            league_repo=_FakeLeagueRepository({9: self._build_elimination(bracket_state={"nodes": {}})}),
        )

        policy.validate_league_schedule_rules(
            self._draft_data(),
            MatchCompetitionStage.FINAL_PHASE,
            None,
            exclude_match_id=44,
        )

    def test_group_match_cannot_be_deleted_after_bracket_generation(self):
        match = SimpleNamespace(
            id=20,
            league_id=7,
            competition_stage="GROUP_STAGE",
            bracket_round=None,
        )
        league_repo = _FakeLeagueRepository({7: self._build_group_league(bracket_state={"nodes": {}})})
        policy = SimpleNamespace(get_existing_match=lambda _match_id: match, league_repo=league_repo)
        service = MatchService(
            match_repo=_FakeMatchRepository([match]),
            unit_of_work=SimpleNamespace(),
            policy=policy,
        )

        with self.assertRaisesRegex(AppException, "fase de grupos esta cerrada"):
            service.delete(20)


if __name__ == "__main__":
    unittest.main()
