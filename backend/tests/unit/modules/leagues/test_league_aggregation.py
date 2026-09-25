import unittest
from types import SimpleNamespace

from modules.leagues.domain import LeagueStatus, compute_league_stats_snapshot
from modules.match_events.domain import MatchEventStatus, MatchEventType
from modules.matches.domain import MatchStatus


class LeagueAggregationTest(unittest.TestCase):
    def test_standings_use_wins_then_configured_tiebreaker_order(self):
        team_lookup = {team_id: SimpleNamespace(id=team_id, name=f"Equipo {team_id}") for team_id in range(1, 5)}
        scores = [(1, 3, 100, 0), (4, 1, 1, 0), (2, 3, 60, 0), (4, 2, 60, 59)]
        matches = [
            SimpleNamespace(
                id=index,
                team_a_id=team_a,
                team_b_id=team_b,
                score_team_a=score_a,
                score_team_b=score_b,
                winner_team_id=team_a,
                is_draw=False,
                status=MatchStatus.FINISHED.value,
            )
            for index, (team_a, team_b, score_a, score_b) in enumerate(scores, start=1)
        ]

        by_difference = compute_league_stats_snapshot(
            league_id=7, league_name="Liga", league_status=LeagueStatus.ACTIVE.value,
            competition_type="LEAGUE", tracked_stats=[], current_team_ids=[1, 2, 3, 4],
            team_lookup=team_lookup, player_lookup={}, matches=matches, events=[],
            standings_tiebreakers=["POINT_DIFFERENCE", "POINTS_FOR", "HEAD_TO_HEAD"],
        )
        by_points_for = compute_league_stats_snapshot(
            league_id=7, league_name="Liga", league_status=LeagueStatus.ACTIVE.value,
            competition_type="LEAGUE", tracked_stats=[], current_team_ids=[1, 2, 3, 4],
            team_lookup=team_lookup, player_lookup={}, matches=matches, events=[],
            standings_tiebreakers=["POINTS_FOR", "POINT_DIFFERENCE", "HEAD_TO_HEAD"],
        )

        tied_by_difference = [row["team_id"] for row in by_difference["standings"] if row["wins"] == 1]
        tied_by_points_for = [row["team_id"] for row in by_points_for["standings"] if row["wins"] == 1]
        self.assertLess(tied_by_difference.index(1), tied_by_difference.index(2))
        self.assertLess(tied_by_points_for.index(2), tied_by_points_for.index(1))

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
            competition_type="LEAGUE",
            tracked_stats=["Fallo", "Faltas", "Asistencias", "Rebotes"],
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

    def test_compute_league_stats_snapshot_counts_played_participation_without_events(self):
        team_lookup = {
            1: SimpleNamespace(id=1, name="Halcones"),
            2: SimpleNamespace(id=2, name="Tigres"),
        }
        player_lookup = {
            10: SimpleNamespace(id=10, name="Alicia"),
            11: SimpleNamespace(id=11, name="Carla"),
        }
        matches = [
            SimpleNamespace(
                id=100,
                team_a_id=1,
                team_b_id=2,
                score_team_a=50,
                score_team_b=48,
                winner_team_id=1,
                is_draw=False,
                status=MatchStatus.FINISHED.value,
            ),
        ]
        events = [
            SimpleNamespace(
                id=1,
                match_id=100,
                team_id=1,
                player_id=10,
                event_type=MatchEventType.POINT_2.value,
                status=MatchEventStatus.ACTIVE.value,
            ),
        ]
        participations = [
            SimpleNamespace(
                match_id=100,
                team_id=1,
                player_id=10,
                present=True,
                played=True,
            ),
            SimpleNamespace(
                match_id=100,
                team_id=1,
                player_id=11,
                present=True,
                played=True,
            ),
        ]

        snapshot = compute_league_stats_snapshot(
            league_id=7,
            league_name="Liga Demo",
            league_status=LeagueStatus.FINISHED.value,
            competition_type="LEAGUE",
            tracked_stats=["Fallo", "Faltas", "Asistencias", "Rebotes"],
            current_team_ids=[1, 2],
            team_lookup=team_lookup,
            player_lookup=player_lookup,
            matches=matches,
            events=events,
            participations=participations,
        )

        player_rows = {row["player_id"]: row for row in snapshot["player_rankings"]}
        self.assertEqual(player_rows[10]["matches_played"], 1)
        self.assertEqual(player_rows[11]["matches_played"], 1)
        self.assertEqual(player_rows[11]["total_points"], 0)

    def test_compute_league_stats_snapshot_excludes_final_phase_from_group_standings(self):
        team_lookup = {
            1: SimpleNamespace(id=1, name="Halcones"),
            2: SimpleNamespace(id=2, name="Tigres"),
            3: SimpleNamespace(id=3, name="Lobos"),
            4: SimpleNamespace(id=4, name="Pumas"),
        }
        matches = [
            SimpleNamespace(
                id=100,
                team_a_id=1,
                team_b_id=2,
                score_team_a=70,
                score_team_b=60,
                winner_team_id=1,
                is_draw=False,
                status=MatchStatus.FINISHED.value,
                competition_stage="GROUP_STAGE",
                group_stage_group_key="A",
                tracked_stats=[],
            ),
            SimpleNamespace(
                id=101,
                team_a_id=3,
                team_b_id=4,
                score_team_a=65,
                score_team_b=55,
                winner_team_id=3,
                is_draw=False,
                status=MatchStatus.FINISHED.value,
                competition_stage="GROUP_STAGE",
                group_stage_group_key="B",
                tracked_stats=[],
            ),
            SimpleNamespace(
                id=102,
                team_a_id=1,
                team_b_id=3,
                score_team_a=75,
                score_team_b=72,
                winner_team_id=1,
                is_draw=False,
                status=MatchStatus.FINISHED.value,
                competition_stage="FINAL_PHASE",
                group_stage_group_key=None,
                tracked_stats=[],
            ),
        ]

        snapshot = compute_league_stats_snapshot(
            league_id=9,
            league_name="Copa Grupos",
            league_status=LeagueStatus.ACTIVE.value,
            competition_type="GROUPS",
            tracked_stats=["Fallo", "Faltas", "Asistencias", "Rebotes"],
            current_team_ids=[1, 2, 3, 4],
            team_lookup=team_lookup,
            player_lookup={},
            matches=matches,
            events=[],
            group_stage_config={
                "mode": "MANUAL",
                "groups": [
                    {"key": "A", "name": "Grupo A", "team_ids": [1, 2]},
                    {"key": "B", "name": "Grupo B", "team_ids": [3, 4]},
                ],
                "qualifiers_per_group": 1,
                "best_extra_slots": 0,
                "wildcard_ranking": "WIN_PERCENTAGE",
                "wildcard_tiebreakers": ["AVERAGE_POINT_DIFFERENCE", "AVERAGE_POINTS_FOR"],
            },
            standings_match_ids={100, 101},
        )

        self.assertEqual(snapshot["overview"]["total_matches"], 3)
        self.assertIsNone(snapshot["overview"]["champion"])
        self.assertEqual(len(snapshot["group_standings"]), 2)
        self.assertEqual(snapshot["group_standings"][0]["group_key"], "A")
        self.assertEqual(snapshot["group_standings"][0]["standings"][0]["team_id"], 1)
        self.assertEqual(snapshot["group_standings"][1]["group_key"], "B")
        self.assertEqual(snapshot["group_standings"][1]["standings"][0]["team_id"], 3)


if __name__ == "__main__":
    unittest.main()
