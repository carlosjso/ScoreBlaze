from __future__ import annotations

from typing import Any

from modules.match_events.domain import MatchEventStatus, MatchEventType
from modules.matches.domain import MatchStatus

from .enums import LeagueStatus
from .rules import LEAGUE_STANDINGS_DRAW_POINTS, LEAGUE_STANDINGS_WIN_POINTS


def _match_status_value(raw_status: Any) -> str:
    if isinstance(raw_status, MatchStatus):
        return raw_status.value
    return str(raw_status)


def _league_status_value(raw_status: Any) -> str:
    if isinstance(raw_status, LeagueStatus):
        return raw_status.value
    return str(raw_status)


def _team_name(team_lookup: dict[int, Any], team_id: int) -> str:
    team = team_lookup.get(team_id)
    return getattr(team, "name", f"Equipo #{team_id}")


def _player_name(player_lookup: dict[int, Any], player_id: int) -> str:
    player = player_lookup.get(player_id)
    return getattr(player, "name", f"Jugador #{player_id}")


def _make_team_row(team_id: int, team_lookup: dict[int, Any]) -> dict[str, Any]:
    return {
        "team_id": team_id,
        "team_name": _team_name(team_lookup, team_id),
        "matches_played": 0,
        "wins": 0,
        "losses": 0,
        "draws": 0,
        "points_for": 0,
        "points_against": 0,
        "points_difference": 0,
        "standings_points": 0,
        "total_team_fouls": 0,
    }


def _make_player_row(
    player_id: int,
    player_lookup: dict[int, Any],
    *,
    team_id: int | None = None,
    team_lookup: dict[int, Any] | None = None,
) -> dict[str, Any]:
    return {
        "player_id": player_id,
        "player_name": _player_name(player_lookup, player_id),
        "team_id": team_id,
        "team_name": _team_name(team_lookup or {}, team_id) if team_id is not None else None,
        "matches_played": 0,
        "total_points": 0,
        "made_1pt": 0,
        "made_2pt": 0,
        "made_3pt": 0,
        "missed_shots": 0,
        "total_assists": 0,
        "total_rebounds": 0,
        "total_fouls": 0,
        "_match_ids": set(),
    }


def _pick_team_leader(rows: list[dict[str, Any]], field: str, *, reverse: bool = True) -> dict[str, Any] | None:
    candidates = [row for row in rows if row["matches_played"] > 0]
    if not candidates:
        return None

    if reverse:
        candidates.sort(
            key=lambda row: (
                row[field],
                row["standings_points"],
                row["wins"],
                row["points_difference"],
                row["points_for"],
                row["team_name"].lower(),
                -row["team_id"],
            ),
            reverse=True,
        )
    else:
        candidates.sort(
            key=lambda row: (
                row[field],
                -row["standings_points"],
                -row["wins"],
                -row["points_difference"],
                -row["points_for"],
                row["team_name"].lower(),
                row["team_id"],
            )
        )

    winner = candidates[0]
    return {
        "team_id": winner["team_id"],
        "team_name": winner["team_name"],
        "value": winner[field],
    }


def _pick_player_leader(rows: list[dict[str, Any]], field: str) -> dict[str, Any] | None:
    candidates = [row for row in rows if row["matches_played"] > 0]
    if not candidates:
        return None

    candidates.sort(
        key=lambda row: (
            row[field],
            row["total_points"],
            row["made_3pt"],
            row["total_assists"],
            row["total_rebounds"],
            row["player_name"].lower(),
            -row["player_id"],
        ),
        reverse=True,
    )

    winner = candidates[0]
    if winner[field] <= 0:
        return None

    return {
        "player_id": winner["player_id"],
        "player_name": winner["player_name"],
        "team_id": winner["team_id"],
        "team_name": winner["team_name"],
        "value": winner[field],
    }


def compute_league_stats_snapshot(
    *,
    league_id: int,
    league_name: str,
    league_status: str,
    tracked_stats: list[str],
    current_team_ids: list[int],
    team_lookup: dict[int, Any],
    player_lookup: dict[int, Any],
    matches: list[Any],
    events: list[Any],
    participations: list[Any] | None = None,
) -> dict[str, Any]:
    team_rows: dict[int, dict[str, Any]] = {}

    for team_id in current_team_ids:
        team_rows[team_id] = _make_team_row(team_id, team_lookup)

    for match in matches:
        team_rows.setdefault(match.team_a_id, _make_team_row(match.team_a_id, team_lookup))
        team_rows.setdefault(match.team_b_id, _make_team_row(match.team_b_id, team_lookup))

    scheduled_matches = 0
    live_matches = 0
    finished_matches = 0
    live_or_finished_match_ids: set[int] = set()
    finished_match_ids: set[int] = set()

    for match in matches:
        match_status = _match_status_value(match.status)
        if match_status == MatchStatus.SCHEDULED.value:
            scheduled_matches += 1
        elif match_status == MatchStatus.LIVE.value:
            live_matches += 1
            live_or_finished_match_ids.add(match.id)
        elif match_status == MatchStatus.FINISHED.value:
            finished_matches += 1
            live_or_finished_match_ids.add(match.id)
            finished_match_ids.add(match.id)

            if match.score_team_a is None or match.score_team_b is None:
                continue

            team_a_row = team_rows.setdefault(match.team_a_id, _make_team_row(match.team_a_id, team_lookup))
            team_b_row = team_rows.setdefault(match.team_b_id, _make_team_row(match.team_b_id, team_lookup))

            team_a_row["matches_played"] += 1
            team_b_row["matches_played"] += 1
            team_a_row["points_for"] += match.score_team_a
            team_a_row["points_against"] += match.score_team_b
            team_b_row["points_for"] += match.score_team_b
            team_b_row["points_against"] += match.score_team_a

            if match.is_draw or match.score_team_a == match.score_team_b:
                team_a_row["draws"] += 1
                team_b_row["draws"] += 1
                team_a_row["standings_points"] += LEAGUE_STANDINGS_DRAW_POINTS
                team_b_row["standings_points"] += LEAGUE_STANDINGS_DRAW_POINTS
            else:
                winner_team_id = match.winner_team_id
                if winner_team_id is None:
                    winner_team_id = match.team_a_id if match.score_team_a > match.score_team_b else match.team_b_id

                loser_team_id = match.team_b_id if winner_team_id == match.team_a_id else match.team_a_id
                winning_row = team_rows[winner_team_id]
                losing_row = team_rows[loser_team_id]
                winning_row["wins"] += 1
                winning_row["standings_points"] += LEAGUE_STANDINGS_WIN_POINTS
                losing_row["losses"] += 1

    for row in team_rows.values():
        row["points_difference"] = row["points_for"] - row["points_against"]

    player_rows: dict[int, dict[str, Any]] = {}

    for participation in participations or []:
        if not participation.played:
            continue
        if participation.match_id not in live_or_finished_match_ids:
            continue

        player_row = player_rows.setdefault(
            participation.player_id,
            _make_player_row(
                participation.player_id,
                player_lookup,
                team_id=participation.team_id,
                team_lookup=team_lookup,
            ),
        )
        player_row["team_id"] = participation.team_id
        player_row["team_name"] = _team_name(team_lookup, participation.team_id)
        player_row["_match_ids"].add(participation.match_id)

    for event in events:
        if event.status != MatchEventStatus.ACTIVE.value:
            continue
        if event.match_id not in live_or_finished_match_ids:
            continue

        team_row = team_rows.setdefault(event.team_id, _make_team_row(event.team_id, team_lookup))
        event_type = MatchEventType(event.event_type)

        if event.match_id in finished_match_ids and event_type == MatchEventType.FOUL:
            team_row["total_team_fouls"] += 1

        if event.player_id is None:
            continue

        player_row = player_rows.setdefault(
            event.player_id,
            _make_player_row(event.player_id, player_lookup, team_id=event.team_id, team_lookup=team_lookup),
        )

        player_row["team_id"] = event.team_id
        player_row["team_name"] = _team_name(team_lookup, event.team_id)
        player_row["_match_ids"].add(event.match_id)

        if event_type == MatchEventType.POINT_1:
            player_row["total_points"] += 1
            player_row["made_1pt"] += 1
        elif event_type == MatchEventType.POINT_2:
            player_row["total_points"] += 2
            player_row["made_2pt"] += 1
        elif event_type == MatchEventType.POINT_3:
            player_row["total_points"] += 3
            player_row["made_3pt"] += 1
        elif event_type == MatchEventType.MISS:
            player_row["missed_shots"] += 1
        elif event_type == MatchEventType.ASSIST:
            player_row["total_assists"] += 1
        elif event_type == MatchEventType.REBOUND:
            player_row["total_rebounds"] += 1
        elif event_type == MatchEventType.FOUL:
            player_row["total_fouls"] += 1

    for row in player_rows.values():
        row["matches_played"] = len(row.pop("_match_ids"))

    standings = sorted(
        team_rows.values(),
        key=lambda row: (
            row["standings_points"],
            row["wins"],
            row["points_difference"],
            row["points_for"],
            row["team_name"].lower(),
            -row["team_id"],
        ),
        reverse=True,
    )

    standings_payload = [
        {
            **row,
            "position": index,
        }
        for index, row in enumerate(standings, start=1)
    ]

    player_rankings = sorted(
        player_rows.values(),
        key=lambda row: (
            row["total_points"],
            row["made_3pt"],
            row["total_assists"],
            row["total_rebounds"],
            row["player_name"].lower(),
            -row["player_id"],
        ),
        reverse=True,
    )

    player_rankings_payload = [
        {
            **row,
            "position": index,
        }
        for index, row in enumerate(player_rankings, start=1)
    ]

    champion = None
    if _league_status_value(league_status) == LeagueStatus.FINISHED.value and standings_payload:
        top_team = standings_payload[0]
        if top_team["matches_played"] > 0:
            champion = {
                "team_id": top_team["team_id"],
                "team_name": top_team["team_name"],
                "value": top_team["standings_points"],
            }

    return {
        "league_id": league_id,
        "league_name": league_name,
        "league_status": _league_status_value(league_status),
        "tracked_stats": tracked_stats,
        "overview": {
            "teams_count": len(team_rows),
            "total_matches": len(matches),
            "scheduled_matches": scheduled_matches,
            "live_matches": live_matches,
            "finished_matches": finished_matches,
            "champion": champion,
        },
        "team_leaders": {
            "top_offense": _pick_team_leader(standings, "points_for"),
            "best_defense": _pick_team_leader(standings, "points_against", reverse=False),
            "most_wins": _pick_team_leader(standings, "wins"),
        },
        "player_leaders": {
            "top_scorer": _pick_player_leader(player_rankings, "total_points"),
            "top_three_point": _pick_player_leader(player_rankings, "made_3pt"),
            "top_two_point": _pick_player_leader(player_rankings, "made_2pt"),
            "top_free_throw": _pick_player_leader(player_rankings, "made_1pt"),
            "top_assist": _pick_player_leader(player_rankings, "total_assists"),
            "top_rebound": _pick_player_leader(player_rankings, "total_rebounds"),
            "top_foul": _pick_player_leader(player_rankings, "total_fouls"),
        },
        "standings": standings_payload,
        "player_rankings": player_rankings_payload,
    }
