import unittest
from datetime import date
from types import SimpleNamespace

from core.exceptions import ValidationException
from modules.leagues.bracket import advance_bracket_match, build_bracket_state, build_bracket_state_from_drafts


class _FakeDb:
    def flush(self):
        return None


class _FakeMatchRepository:
    def __init__(self, matches=None):
        self.db = _FakeDb()
        self.matches = list(matches or [])

    def add(self, match):
        match.id = len(self.matches) + 1
        self.matches.append(match)
        return match

    def list_by_ids(self, match_ids):
        ids = set(match_ids)
        return [match for match in self.matches if match.id in ids]

    @staticmethod
    def update(match, **fields):
        for key, value in fields.items():
            setattr(match, key, value)
        return match

    def delete(self, match):
        self.matches.remove(match)


class AdvancedBracketsTest(unittest.TestCase):
    def _league(self, bracket_format, *, play_in_slots=0, grand_final_reset=False, third_place=False):
        return SimpleNamespace(
            id=10,
            start_date=date(2026, 1, 1),
            end_date=date(2027, 1, 1),
            tracked_stats=["points"],
            bracket_state=None,
            final_phase_format=bracket_format,
            final_phase_play_in_slots=play_in_slots,
            final_phase_round_best_of=1,
            final_phase_final_best_of=1,
            final_phase_grand_final_reset=grand_final_reset,
            final_phase_third_place_match=third_place,
            final_phase_seeded_home_advantage=False,
            status="Sin empezar",
        )

    @staticmethod
    def _finish(league, repo, match, winner_team_id):
        previous_winner = match.winner_team_id
        match.status = "finished"
        match.winner_team_id = winner_team_id
        match.score_team_a = 1 if match.team_a_id == winner_team_id else 0
        match.score_team_b = 1 if match.team_b_id == winner_team_id else 0
        return advance_bracket_match(league, match, previous_winner, repo)

    def test_nba_play_in_waits_before_opening_main_bracket(self):
        league = self._league("PLAY_IN_PLUS_BRACKET", play_in_slots=4)
        repo = _FakeMatchRepository()
        state, created = build_bracket_state(league, list(range(1, 11)), repo)
        league.bracket_state = state

        self.assertEqual(len(created), 2)
        self.assertEqual({match.bracket_path for match in created}, {"PLAY_IN"})
        high, low = sorted(created, key=lambda match: match.bracket_slot)
        self._finish(league, repo, high, high.team_a_id)
        decider_created = self._finish(league, repo, low, low.team_a_id)
        self.assertEqual(len(decider_created), 1)
        decider = decider_created[0]
        self.assertEqual(decider.bracket_path, "PLAY_IN")

        main_created = self._finish(league, repo, decider, decider.team_a_id)
        self.assertEqual(len(main_created), 4)
        self.assertEqual({match.bracket_path for match in main_created}, {"MAIN"})

    def test_double_elimination_drops_losers_and_uses_final_reset(self):
        league = self._league("DOUBLE_ELIMINATION", grand_final_reset=True)
        repo = _FakeMatchRepository()
        state, created = build_bracket_state(league, [1, 2, 3, 4], repo)
        league.bracket_state = state

        self.assertEqual(len(created), 2)
        winners_round_one = sorted(created, key=lambda match: match.bracket_slot)
        created_after_first = self._finish(league, repo, winners_round_one[0], winners_round_one[0].team_a_id)
        self.assertEqual(created_after_first, [])
        created_after_second = self._finish(league, repo, winners_round_one[1], winners_round_one[1].team_a_id)
        winners_final = next(match for match in created_after_second if match.bracket_path == "WINNERS")
        losers_round_one = next(match for match in created_after_second if match.bracket_path == "LOSERS")

        self._finish(league, repo, losers_round_one, losers_round_one.team_a_id)
        losers_final_created = self._finish(league, repo, winners_final, winners_final.team_a_id)
        losers_final = losers_final_created[0]
        self.assertEqual(losers_final.bracket_path, "LOSERS")
        grand_final_created = self._finish(league, repo, losers_final, losers_final.team_a_id)
        grand_final = grand_final_created[0]
        self.assertEqual(grand_final.bracket_path, "GRAND_FINAL")

        lower_team_id = losers_final.team_a_id
        reset_created = self._finish(league, repo, grand_final, lower_team_id)
        self.assertEqual(len(reset_created), 1)
        self.assertEqual(reset_created[0].tournament, "Reinicio de gran final")
        self._finish(league, repo, reset_created[0], reset_created[0].team_a_id)
        self.assertEqual(league.bracket_state["champion_team_id"], reset_created[0].team_a_id)
        self.assertEqual(league.status, "Finalizada")

    def test_eight_team_double_elimination_completes_without_orphan_rounds(self):
        league = self._league("DOUBLE_ELIMINATION")
        repo = _FakeMatchRepository()
        state, _ = build_bracket_state(league, list(range(1, 9)), repo)
        league.bracket_state = state

        processed_ids = set()
        while league.bracket_state["champion_team_id"] is None:
            ready = next((match for match in repo.matches if match.id not in processed_ids), None)
            self.assertIsNotNone(ready, "La llave quedo detenida sin un siguiente cruce.")
            processed_ids.add(ready.id)
            self._finish(league, repo, ready, ready.team_a_id)

        self.assertEqual(len(repo.matches), 14)
        self.assertEqual(len(processed_ids), 14)
        self.assertEqual(repo.matches[-1].bracket_path, "GRAND_FINAL")

    def test_manual_drafts_become_the_official_first_round(self):
        league = self._league("SINGLE_ELIMINATION")
        drafts = [
            SimpleNamespace(id=1, team_a_id=1, team_b_id=6, status="scheduled", score_team_a=None, score_team_b=None, winner_team_id=None),
            SimpleNamespace(id=2, team_a_id=2, team_b_id=5, status="scheduled", score_team_a=None, score_team_b=None, winner_team_id=None),
        ]
        repo = _FakeMatchRepository(drafts)

        state, created = build_bracket_state_from_drafts(league, [1, 2, 3, 4, 5, 6], drafts, repo)

        self.assertTrue(all(draft.bracket_round == 1 for draft in drafts))
        self.assertTrue(all(draft.bracket_path == "MAIN" for draft in drafts))
        self.assertTrue({1, 2}.issubset({match.id for match in created}))
        node_match_ids = {match_id for node in state["nodes"].values() for match_id in node.get("match_ids", [])}
        self.assertTrue({1, 2}.issubset(node_match_ids))
        self.assertEqual(len([match for match in repo.matches if {match.team_a_id, match.team_b_id} == {1, 6}]), 1)

    def test_manual_drafts_reject_advanced_bracket_formats(self):
        drafts = [
            SimpleNamespace(id=1, team_a_id=1, team_b_id=4, status="scheduled", score_team_a=None, score_team_b=None, winner_team_id=None),
            SimpleNamespace(id=2, team_a_id=2, team_b_id=3, status="scheduled", score_team_a=None, score_team_b=None, winner_team_id=None),
        ]

        for bracket_format in ("PLAY_IN_PLUS_BRACKET", "DOUBLE_ELIMINATION"):
            with self.subTest(bracket_format=bracket_format):
                league = self._league(bracket_format)
                repo = _FakeMatchRepository(drafts.copy())
                with self.assertRaisesRegex(ValidationException, "solo aplican a la eliminacion directa simple"):
                    build_bracket_state_from_drafts(league, [1, 2, 3, 4], drafts, repo)

    def test_play_in_waits_for_third_place_before_finishing(self):
        league = self._league("PLAY_IN_PLUS_BRACKET", play_in_slots=4, third_place=True)
        repo = _FakeMatchRepository()
        state, _ = build_bracket_state(league, list(range(1, 11)), repo)
        league.bracket_state = state

        processed_ids = set()
        while league.bracket_state["champion_team_id"] is None:
            ready = next(
                (match for match in repo.matches if match.id not in processed_ids and match.bracket_path != "THIRD_PLACE"),
                None,
            )
            self.assertIsNotNone(ready)
            processed_ids.add(ready.id)
            self._finish(league, repo, ready, ready.team_a_id)

        third_place = next(match for match in repo.matches if match.bracket_path == "THIRD_PLACE")
        self.assertNotEqual(league.status, "Finalizada")
        self._finish(league, repo, third_place, third_place.team_a_id)
        self.assertEqual(league.status, "Finalizada")


if __name__ == "__main__":
    unittest.main()
