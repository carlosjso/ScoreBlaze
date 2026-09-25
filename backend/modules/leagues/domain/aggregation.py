from __future__ import annotations

from typing import Any

from modules.match_events.domain import MatchEventStatus, MatchEventType
from modules.matches.domain import MatchCompetitionStage, MatchStatus
from modules.matches.tracked_stats import does_track_stat, normalize_match_tracked_stats

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


def _match_stage_value(raw_stage: Any) -> str:
    if isinstance(raw_stage, MatchCompetitionStage):
        return raw_stage.value
    if raw_stage is None:
        return MatchCompetitionStage.REGULAR_SEASON.value
    return str(raw_stage)


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


def _build_standings_payload(
    *,
    team_ids: list[int],
    team_lookup: dict[int, Any],
    matches: list[Any],
    standings_match_ids: set[int],
    standings_tiebreakers: list[str] | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    team_rows: dict[int, dict[str, Any]] = {}

    for team_id in team_ids:
        team_rows[team_id] = _make_team_row(team_id, team_lookup)

    for match in matches:
        if match.id not in standings_match_ids:
            continue

        team_rows.setdefault(match.team_a_id, _make_team_row(match.team_a_id, team_lookup))
        team_rows.setdefault(match.team_b_id, _make_team_row(match.team_b_id, team_lookup))

    for match in matches:
        if match.id not in standings_match_ids:
            continue

        match_status = _match_status_value(match.status)
        if match_status != MatchStatus.FINISHED.value:
            continue

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

    resolved_tiebreakers = standings_tiebreakers or ["HEAD_TO_HEAD", "POINT_DIFFERENCE", "POINTS_FOR"]
    head_to_head: dict[int, tuple[int, int]] = {}
    for row in team_rows.values():
        tied_team_ids = {candidate["team_id"] for candidate in team_rows.values() if candidate["wins"] == row["wins"]}
        wins = 0
        difference = 0
        for match in matches:
            if match.id not in standings_match_ids or _match_status_value(match.status) != MatchStatus.FINISHED.value:
                continue
            if match.team_a_id not in tied_team_ids or match.team_b_id not in tied_team_ids:
                continue
            if match.score_team_a is None or match.score_team_b is None:
                continue
            if row["team_id"] == match.team_a_id:
                difference += match.score_team_a - match.score_team_b
            elif row["team_id"] == match.team_b_id:
                difference += match.score_team_b - match.score_team_a
            else:
                continue
            if match.winner_team_id == row["team_id"]:
                wins += 1
        head_to_head[row["team_id"]] = (wins, difference)

    def standings_sort_key(row: dict[str, Any]) -> tuple[Any, ...]:
        key: list[Any] = [-row["wins"]]
        for criterion in resolved_tiebreakers:
            if criterion == "HEAD_TO_HEAD":
                direct_wins, direct_difference = head_to_head[row["team_id"]]
                key.extend((-direct_wins, -direct_difference))
            elif criterion == "POINT_DIFFERENCE":
                key.append(-row["points_difference"])
            elif criterion == "POINTS_FOR":
                key.append(-row["points_for"])
        key.extend((row["team_name"].lower(), row["team_id"]))
        return tuple(key)

    standings = sorted(team_rows.values(), key=standings_sort_key)

    return standings, [
        {
            **row,
            "position": index,
        }
        for index, row in enumerate(standings, start=1)
    ]


def build_league_standings(
    *,
    team_ids: list[int],
    team_lookup: dict[int, Any],
    matches: list[Any],
    standings_match_ids: set[int],
    standings_tiebreakers: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Build the canonical ordered table used to freeze playoff qualifiers."""
    _, standings = _build_standings_payload(
        team_ids=team_ids,
        team_lookup=team_lookup,
        matches=matches,
        standings_match_ids=standings_match_ids,
        standings_tiebreakers=standings_tiebreakers,
    )
    return standings


def _build_group_standings_payload(
    *,
    group_stage_config: dict[str, Any] | None,
    team_lookup: dict[int, Any],
    matches: list[Any],
    standings_tiebreakers: list[str] | None = None,
) -> list[dict[str, Any]]:
    if not isinstance(group_stage_config, dict):
        return []

    raw_groups = group_stage_config.get("groups")
    if not isinstance(raw_groups, list):
        return []

    group_matches_by_key: dict[str, list[Any]] = {}
    for match in matches:
        if _match_stage_value(getattr(match, "competition_stage", None)) != MatchCompetitionStage.GROUP_STAGE.value:
            continue

        group_key = str(getattr(match, "group_stage_group_key", "") or "").strip()
        if not group_key:
            continue

        group_matches_by_key.setdefault(group_key, []).append(match)

    payload: list[dict[str, Any]] = []
    for raw_group in raw_groups:
        if not isinstance(raw_group, dict):
            continue

        group_key = str(raw_group.get("key", "") or "").strip()
        if not group_key:
            continue

        raw_team_ids = raw_group.get("team_ids", [])
        group_team_ids = [int(team_id) for team_id in raw_team_ids] if isinstance(raw_team_ids, list) else []
        group_matches = group_matches_by_key.get(group_key, [])
        _, standings_payload = _build_standings_payload(
            team_ids=group_team_ids,
            team_lookup=team_lookup,
            matches=group_matches,
            standings_match_ids={match.id for match in group_matches},
            standings_tiebreakers=standings_tiebreakers,
        )

        payload.append(
            {
                "group_key": group_key,
                "group_name": str(raw_group.get("name", group_key) or group_key),
                "team_ids": group_team_ids,
                "match_count": len(group_matches),
                "standings": standings_payload,
            }
        )

    return payload


def build_group_qualification_order(
    *,
    group_stage_config: dict[str, Any] | None,
    team_lookup: dict[int, Any],
    matches: list[Any],
    standings_tiebreakers: list[str] | None = None,
) -> list[dict[str, Any]]:
    """Build the official fixed qualifiers and cross-group wildcard order."""
    if not isinstance(group_stage_config, dict):
        return []

    group_standings = _build_group_standings_payload(
        group_stage_config=group_stage_config,
        team_lookup=team_lookup,
        matches=matches,
        standings_tiebreakers=standings_tiebreakers,
    )
    qualifiers_per_group = int(group_stage_config.get("qualifiers_per_group", 0) or 0)
    best_extra_slots = int(group_stage_config.get("best_extra_slots", 0) or 0)
    fixed_qualifiers: list[dict[str, Any]] = []
    wildcard_candidates: list[dict[str, Any]] = []

    for position in range(qualifiers_per_group):
        for group in group_standings:
            standings = group["standings"]
            if position < len(standings):
                fixed_qualifiers.append(standings[position])

    for group in group_standings:
        wildcard_candidates.extend(group["standings"][qualifiers_per_group:])

    wildcard_tiebreakers = group_stage_config.get("wildcard_tiebreakers", [])
    if not isinstance(wildcard_tiebreakers, list):
        wildcard_tiebreakers = []

    def wildcard_sort_key(row: dict[str, Any]) -> tuple[Any, ...]:
        played = int(row["matches_played"])
        divisor = played if played > 0 else 1
        key: list[Any] = [-int(row["wins"]) / divisor]
        for criterion in wildcard_tiebreakers:
            if criterion == "AVERAGE_POINT_DIFFERENCE":
                key.append(-int(row["points_difference"]) / divisor)
            elif criterion == "AVERAGE_POINTS_FOR":
                key.append(-int(row["points_for"]) / divisor)
        key.extend((str(row["team_name"]).lower(), int(row["team_id"])))
        return tuple(key)

    wildcard_candidates.sort(key=wildcard_sort_key)
    qualified = fixed_qualifiers + wildcard_candidates[:best_extra_slots]
    return [{**row, "position": index} for index, row in enumerate(qualified, start=1)]


def compute_league_stats_snapshot(
    *,
    league_id: int,
    league_name: str,
    league_status: str,
    competition_type: str,
    tracked_stats: list[str],
    current_team_ids: list[int],
    team_lookup: dict[int, Any],
    player_lookup: dict[int, Any],
    matches: list[Any],
    events: list[Any],
    participations: list[Any] | None = None,
    group_stage_config: dict[str, Any] | None = None,
    standings_match_ids: set[int] | None = None,
    standings_tiebreakers: list[str] | None = None,
) -> dict[str, Any]:
    resolved_standings_match_ids = standings_match_ids if standings_match_ids is not None else {match.id for match in matches}
    match_by_id = {match.id: match for match in matches}
    standings, standings_payload = _build_standings_payload(
        team_ids=current_team_ids,
        team_lookup=team_lookup,
        matches=matches,
        standings_match_ids=resolved_standings_match_ids,
        standings_tiebreakers=standings_tiebreakers,
    )
    team_rows_by_id = {row["team_id"]: row for row in standings}

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

        event_match = match_by_id.get(event.match_id)
        event_tracked_stats = normalize_match_tracked_stats(
            getattr(event_match, "tracked_stats", None) or tracked_stats,
        )
        team_row = team_rows_by_id.setdefault(event.team_id, _make_team_row(event.team_id, team_lookup))
        event_type = MatchEventType(event.event_type)

        if (
            event.match_id in finished_match_ids
            and event_type == MatchEventType.FOUL
            and does_track_stat("Faltas", event_tracked_stats)
        ):
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
        elif event_type == MatchEventType.MISS and does_track_stat("Fallo", event_tracked_stats):
            player_row["missed_shots"] += 1
        elif event_type == MatchEventType.ASSIST and does_track_stat("Asistencias", event_tracked_stats):
            player_row["total_assists"] += 1
        elif event_type == MatchEventType.REBOUND and does_track_stat("Rebotes", event_tracked_stats):
            player_row["total_rebounds"] += 1
        elif event_type == MatchEventType.FOUL and does_track_stat("Faltas", event_tracked_stats):
            player_row["total_fouls"] += 1

    for row in player_rows.values():
        row["matches_played"] = len(row.pop("_match_ids"))

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
    excluded_from_standings_count = len(matches) - len(resolved_standings_match_ids)
    overview_team_ids = set(current_team_ids)
    for match in matches:
        overview_team_ids.add(match.team_a_id)
        overview_team_ids.add(match.team_b_id)

    if (
        competition_type != "GROUPS"
        and excluded_from_standings_count == 0
        and _league_status_value(league_status) == LeagueStatus.FINISHED.value
        and standings_payload
    ):
        top_team = standings_payload[0]
        if top_team["matches_played"] > 0:
            champion = {
                "team_id": top_team["team_id"],
                "team_name": top_team["team_name"],
                "value": top_team["wins"],
            }

    group_standings_payload = _build_group_standings_payload(
        group_stage_config=group_stage_config,
        team_lookup=team_lookup,
        matches=matches,
        standings_tiebreakers=standings_tiebreakers,
    )

    return {
        "league_id": league_id,
        "league_name": league_name,
        "league_status": _league_status_value(league_status),
        "tracked_stats": tracked_stats,
        "overview": {
            "teams_count": len(overview_team_ids),
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
        "group_standings": group_standings_payload,
        "player_rankings": player_rankings_payload,
    }
