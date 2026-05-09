import unittest
from types import SimpleNamespace

from modules.leagues.domain import LeagueStatus, compute_league_stats_snapshot
from modules.match_events.domain import MatchEventStatus, MatchEventType
from modules.matches.domain import MatchStatus


class LeagueAggregationTest(unittest.TestCase):
    def test_compute_league_stats_snapshot_builds_team_and_player_leaders(self):
        team_lookup = {
            1: SimpleNamespace(id=1, name="Halcones"),
            2: SimpleNamespace(id=2, name="Tigres"),
        }
        player_lookup = {
            10: SimpleNamespace(id=10, name="Alicia"),
            20: SimpleNamespace(id=20, name="Bruno"),
        }
        matches = [
            SimpleNamespace(
                id=100,
                team_a_id=1,
                team_b_id=2,
                score_team_a=78,
                score_team_b=65,
                winner_team_id=1,
                is_draw=False,
                status=MatchStatus.FINISHED.value,
            ),
            SimpleNamespace(
                id=101,
                team_a_id=1,
                team_b_id=2,
                score_team_a=None,
                score_team_b=None,
                winner_team_id=None,
                is_draw=False,
                status=MatchStatus.SCHEDULED.value,
            ),
        ]
        events = [
            SimpleNamespace(
                id=1,
                match_id=100,
                team_id=1,
                player_id=10,
                event_type=MatchEventType.POINT_3.value,
                status=MatchEventStatus.ACTIVE.value,
            ),
            SimpleNamespace(
                id=2,
                match_id=100,
                team_id=1,
                player_id=10,
                event_type=MatchEventType.ASSIST.value,
                status=MatchEventStatus.ACTIVE.value,
            ),
            SimpleNamespace(
                id=3,
                match_id=100,
                team_id=1,
                player_id=10,
                event_type=MatchEventType.REBOUND.value,
                status=MatchEventStatus.ACTIVE.value,
            ),
            SimpleNamespace(
                id=4,
                match_id=100,
                team_id=1,
                player_id=10,
                event_type=MatchEventType.FOUL.value,
                status=MatchEventStatus.ACTIVE.value,
            ),
            SimpleNamespace(
                id=5,
                match_id=100,
                team_id=2,
                player_id=20,
                event_type=MatchEventType.POINT_2.value,
                status=MatchEventStatus.ACTIVE.value,
            ),
        ]

        snapshot = compute_league_stats_snapshot(
            league_id=7,
            league_name="Liga Demo",
            league_status=LeagueStatus.FINISHED.value,
            tracked_stats=["Triples", "Asistencias", "Puntos", "Faltas"],
            current_team_ids=[1, 2],
            team_lookup=team_lookup,
            player_lookup=player_lookup,
            matches=matches,
            events=events,
        )

        self.assertEqual(snapshot["overview"]["total_matches"], 2)
        self.assertEqual(snapshot["overview"]["finished_matches"], 1)
        self.assertEqual(snapshot["overview"]["champion"]["team_id"], 1)
        self.assertEqual(snapshot["team_leaders"]["top_offense"]["team_id"], 1)
        self.assertEqual(snapshot["team_leaders"]["best_defense"]["team_id"], 1)
        self.assertEqual(snapshot["player_leaders"]["top_scorer"]["player_id"], 10)
        self.assertEqual(snapshot["player_leaders"]["top_three_point"]["value"], 1)
        self.assertEqual(snapshot["player_leaders"]["top_assist"]["value"], 1)
        self.assertEqual(snapshot["player_leaders"]["top_rebound"]["value"], 1)
        self.assertEqual(snapshot["player_leaders"]["top_foul"]["value"], 1)
        self.assertEqual(snapshot["standings"][0]["team_id"], 1)
        self.assertEqual(snapshot["standings"][0]["standings_points"], 2)
        self.assertEqual(snapshot["player_rankings"][0]["player_id"], 10)
        self.assertEqual(snapshot["player_rankings"][0]["matches_played"], 1)


if __name__ == "__main__":
    unittest.main()
