import unittest
from datetime import date
from types import SimpleNamespace

from modules.leagues.bracket import advance_bracket_match, build_bracket_state, required_byes


class _FakeDb:
    def flush(self):
        return None


class _FakeMatchRepository:
    def __init__(self):
        self.db = _FakeDb()
        self.matches = []

    def add(self, match):
        match.id = len(self.matches) + 1
        self.matches.append(match)
        return match

    def list_by_ids(self, match_ids):
        ids = set(match_ids)
        return [match for match in self.matches if match.id in ids]


class SingleEliminationBracketTest(unittest.TestCase):
    def setUp(self):
        self.league = SimpleNamespace(
            id=10,
            start_date=date(2026, 1, 1),
            end_date=date(2027, 1, 1),
            tracked_stats=["points"],
            status="En curso",
            bracket_state=None,
            final_phase_two_legs=False,
            final_phase_round_best_of=1,
            final_phase_final_best_of=1,
        )
        self.repo = _FakeMatchRepository()

    def _finish(self, match, winner_team_id, score_team_a=1, score_team_b=0):
        previous_winner = match.winner_team_id
        match.status = "finished"
        match.winner_team_id = winner_team_id
        match.score_team_a = score_team_a
        match.score_team_b = score_team_b
        return advance_bracket_match(self.league, match, previous_winner, self.repo)

    def test_required_byes_completes_next_power_of_two(self):
        self.assertEqual(required_byes(6), 2)
        self.assertEqual(required_byes(8), 0)
        self.assertEqual(required_byes(10), 6)

    def test_six_team_bracket_advances_byes_and_creates_final(self):
        state, first_round = build_bracket_state(self.league, [1, 2, 3, 4, 5, 6], self.repo)
        self.league.bracket_state = state

        self.assertEqual(len(first_round), 2)
        self.assertEqual({match.bracket_slot for match in first_round}, {2, 4})

        created = self._finish(first_round[0], first_round[0].team_a_id)
        self.assertEqual(len(created), 1)
        created += self._finish(first_round[1], first_round[1].team_a_id)
        self.assertEqual(len(created), 2)

        semifinals = [match for match in self.repo.matches if match.bracket_round == 2]
        self.assertEqual(len(semifinals), 2)
        self._finish(semifinals[0], semifinals[0].team_a_id)
        final_created = self._finish(semifinals[1], semifinals[1].team_a_id)
        self.assertEqual(len(final_created), 1)

        final = final_created[0]
        self._finish(final, final.team_a_id)
        self.assertEqual(self.league.bracket_state["champion_team_id"], final.team_a_id)
        self.assertEqual(self.league.status, "Finalizada")

    def test_best_of_three_creates_only_games_needed_to_clinch(self):
        self.league.final_phase_final_best_of = 3
        state, created = build_bracket_state(self.league, [1, 2], self.repo)
        self.league.bracket_state = state

        self.assertEqual(len(created), 1)
        game_one = created[0]
        next_games = self._finish(game_one, game_one.team_a_id)
        self.assertEqual(len(next_games), 1)
        game_two = next_games[0]
        self.assertEqual(game_two.bracket_game, 2)

        self._finish(game_two, game_one.team_a_id)
        self.assertEqual(len(self.repo.matches), 2)
        self.assertEqual(self.league.bracket_state["champion_team_id"], game_one.team_a_id)

    def test_third_place_match_uses_semifinal_losers(self):
        self.league.final_phase_third_place_match = True
        state, semifinals = build_bracket_state(self.league, [1, 2, 3, 4], self.repo)
        self.league.bracket_state = state

        self._finish(semifinals[0], semifinals[0].team_a_id)
        created = self._finish(semifinals[1], semifinals[1].team_a_id)
        third_place = next(match for match in created if match.bracket_path == "THIRD_PLACE")
        expected_losers = {semifinals[0].team_b_id, semifinals[1].team_b_id}
        self.assertEqual({third_place.team_a_id, third_place.team_b_id}, expected_losers)

        final = next(match for match in created if match.bracket_path == "MAIN")
        self._finish(final, final.team_a_id)
        self.assertNotEqual(self.league.status, "Finalizada")

        self._finish(third_place, third_place.team_a_id)
        self.assertEqual(self.league.status, "Finalizada")

    def test_reseeding_pairs_best_remaining_seed_against_worst(self):
        self.league.final_phase_reseed_each_round = True
        state, first_round = build_bracket_state(self.league, list(range(1, 9)), self.repo)
        self.league.bracket_state = state
        selected_winners = [1, 5, 2, 6]

        for match, winner_team_id in zip(sorted(first_round, key=lambda item: item.bracket_slot), selected_winners):
            self._finish(match, winner_team_id)

        semifinals = sorted(
            [match for match in self.repo.matches if match.bracket_round == 2],
            key=lambda item: item.bracket_slot,
        )
        self.assertEqual({semifinals[0].team_a_id, semifinals[0].team_b_id}, {1, 6})
        self.assertEqual({semifinals[1].team_a_id, semifinals[1].team_b_id}, {2, 5})

if __name__ == "__main__":
    unittest.main()
