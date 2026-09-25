from __future__ import annotations

from itertools import combinations
from typing import Any

from modules.matches.domain import MatchCompetitionStage, MatchStatus


def summarize_group_schedule(
    *,
    group_stage_config: dict[str, Any] | None,
    regular_season_format: str,
    matches: list[Any],
) -> dict[str, int]:
    """Return canonical coverage for the configured group-stage calendar."""
    groups = group_stage_config.get("groups", []) if isinstance(group_stage_config, dict) else []
    required_per_pair = 2 if str(regular_season_format) == "DOUBLE_ROUND" else 1
    expected_pairs_by_group: dict[str, set[tuple[int, int]]] = {}

    for group in groups if isinstance(groups, list) else []:
        if not isinstance(group, dict):
            continue
        group_key = str(group.get("key", "") or "").strip()
        raw_team_ids = group.get("team_ids", [])
        if not group_key or not isinstance(raw_team_ids, list):
            continue
        team_ids = [int(team_id) for team_id in raw_team_ids]
        expected_pairs_by_group[group_key] = {
            tuple(sorted(pair)) for pair in combinations(team_ids, 2)
        }

    pair_counts: dict[tuple[str, tuple[int, int]], int] = {}
    unfinished_matches = 0
    for match in matches:
        if str(getattr(match, "competition_stage", "")) != MatchCompetitionStage.GROUP_STAGE.value:
            continue
        group_key = str(getattr(match, "group_stage_group_key", "") or "").strip()
        pair = tuple(sorted((int(match.team_a_id), int(match.team_b_id))))
        if pair not in expected_pairs_by_group.get(group_key, set()):
            continue
        key = (group_key, pair)
        pair_counts[key] = pair_counts.get(key, 0) + 1
        if str(getattr(match, "status", "")) != MatchStatus.FINISHED.value:
            unfinished_matches += 1

    expected_matches = sum(len(pairs) * required_per_pair for pairs in expected_pairs_by_group.values())
    covered_matches = sum(min(count, required_per_pair) for count in pair_counts.values())
    duplicate_matches = sum(max(0, count - required_per_pair) for count in pair_counts.values())
    return {
        "missing_matches": max(0, expected_matches - covered_matches),
        "unfinished_matches": unfinished_matches,
        "duplicate_matches": duplicate_matches,
    }
