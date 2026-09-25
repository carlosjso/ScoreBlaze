from __future__ import annotations

from datetime import date, time, timedelta
from math import log2

from core.exceptions import ValidationException
from data.orm import League, Match
from modules.matches.domain import MatchStatus
from modules.matches.repositories import MatchRepository


def next_power_of_two(value: int) -> int:
    return 1 << max(1, value - 1).bit_length()


def required_byes(team_count: int) -> int:
    return next_power_of_two(team_count) - team_count


def build_seed_order(size: int) -> list[int]:
    if size <= 2:
        return [1, 2][:size]
    previous = build_seed_order(size // 2)
    return [candidate for seed in previous for candidate in (seed, size + 1 - seed)]


def round_name(size: int, round_number: int) -> str:
    teams_in_round = size // (2 ** (round_number - 1))
    if teams_in_round <= 2:
        return "Final"
    if teams_in_round <= 4:
        return "Semifinal"
    if teams_in_round <= 8:
        return "Cuartos de final"
    if teams_in_round <= 16:
        return "Octavos de final"
    return f"Ronda de {teams_in_round}"


def _match_schedule(league: League, round_number: int, slot: int, game_number: int) -> tuple[date, time, time]:
    today = date.today()
    match_date = min(max(today, league.start_date), league.end_date)
    match_date += timedelta(days=max(0, round_number - 1) * 3 + game_number - 1)
    match_date = min(match_date, league.end_date)
    start_minutes = min(8 * 60 + (slot - 1) * 75, 22 * 60)
    return (
        match_date,
        time(hour=start_minutes // 60, minute=start_minutes % 60),
        time(hour=(start_minutes + 60) // 60, minute=(start_minutes + 60) % 60),
    )


def _series_settings(league: League, *, is_final: bool = False) -> tuple[str, int]:
    best_of = int(league.final_phase_final_best_of if is_final else league.final_phase_round_best_of)
    return ("SINGLE" if best_of == 1 else "BEST_OF"), best_of


def _create_match(
    league: League,
    node: dict,
    match_repo: MatchRepository,
    ordered_team_ids: list[int] | None = None,
) -> Match:
    match_ids = list(node.get("match_ids", []))
    game_number = len(match_ids) + 1
    schedule_round = int(node.get("schedule_round", node["round"]))
    match_date, start_time, end_time = _match_schedule(league, schedule_round, int(node["slot"]), game_number)
    base_team_a_id = int(node["team_a_id"])
    base_team_b_id = int(node["team_b_id"])
    uses_seeded_home_advantage = (
        str(getattr(league, "competition_type", "")) != "ELIMINATION"
        and bool(getattr(league, "final_phase_seeded_home_advantage", False))
    )
    if uses_seeded_home_advantage and ordered_team_ids:
        seed_rank = {int(team_id): index for index, team_id in enumerate(ordered_team_ids)}
        if seed_rank.get(base_team_b_id, len(seed_rank)) < seed_rank.get(base_team_a_id, len(seed_rank)):
            base_team_a_id, base_team_b_id = base_team_b_id, base_team_a_id
    reverse_home = game_number % 2 == 0
    team_a_id = base_team_b_id if reverse_home else base_team_a_id
    team_b_id = base_team_a_id if reverse_home else base_team_b_id
    series_suffix = "" if node["series_mode"] == "SINGLE" else f" - Juego {game_number}"
    title = node.get("title") or f"{round_name(int(node['bracket_size']), int(node['round']))} {int(node['slot'])}"
    match = Match(
        match_date=match_date,
        start_time=start_time,
        end_time=end_time,
        team_a_id=team_a_id,
        team_b_id=team_b_id,
        league_id=league.id,
        score_team_a=None,
        score_team_b=None,
        winner_team_id=None,
        is_draw=False,
        court=None,
        tournament=f"{title}{series_suffix}",
        tracked_stats=list(league.tracked_stats or []),
        competition_stage="FINAL_PHASE",
        group_stage_group_key=None,
        bracket_round=int(node["round"]),
        bracket_slot=int(node["slot"]),
        bracket_size=int(node["bracket_size"]),
        bracket_game=game_number,
        bracket_series_mode=str(node["series_mode"]),
        bracket_series_best_of=int(node["series_best_of"]),
        bracket_path=str(node.get("path", "MAIN")),
        status=MatchStatus.SCHEDULED.value,
    )
    match_repo.add(match)
    match_repo.db.flush()
    match_ids.append(int(match.id))
    node["match_ids"] = match_ids
    node["match_id"] = int(match.id)
    return match


def _new_node(
    league: League,
    *,
    key: str,
    path: str,
    size: int,
    round_number: int,
    slot: int,
    title: str,
    sources: list[dict],
    order: int,
    is_final: bool = False,
    force_single: bool = False,
    is_third_place: bool = False,
) -> dict:
    series_mode, series_best_of = ("SINGLE", 1) if force_single else _series_settings(league, is_final=is_final)
    return {
        "key": key,
        "path": path,
        "round": round_number,
        "slot": slot,
        "schedule_round": order,
        "bracket_size": size,
        "title": title,
        "sources": sources,
        "team_a_id": None,
        "team_b_id": None,
        "match_id": None,
        "match_ids": [],
        "winner_team_id": None,
        "loser_team_id": None,
        "series_mode": series_mode,
        "series_best_of": series_best_of,
        "order": order,
        "is_third_place": is_third_place,
    }


def _team_source(team_id: int) -> dict:
    return {"type": "TEAM", "team_id": int(team_id)}


def _outcome_source(node_key: str, outcome: str = "WINNER") -> dict:
    return {"type": outcome, "node_key": node_key}


def _resolve_source(source: dict, nodes: dict[str, dict]) -> tuple[bool, int | None]:
    if source["type"] == "TEAM":
        return True, int(source["team_id"])
    source_node = nodes.get(str(source["node_key"]))
    if not source_node:
        return False, None
    field = "winner_team_id" if source["type"] == "WINNER" else "loser_team_id"
    team_id = source_node.get(field)
    return team_id is not None, int(team_id) if team_id is not None else None


def _graph_node_ready(node: dict, nodes: dict[str, dict]) -> tuple[bool, list[int]]:
    for required_key in node.get("requires", []):
        if nodes.get(str(required_key), {}).get("winner_team_id") is None:
            return False, []

    conditional = node.get("conditional")
    if conditional:
        condition_node = nodes.get(str(conditional["node_key"]))
        reference_node = nodes.get(str(conditional["reference_node_key"]))
        if not condition_node or not reference_node or condition_node.get("winner_team_id") is None:
            return False, []
        reference_field = "winner_team_id" if conditional["reference_outcome"] == "WINNER" else "loser_team_id"
        if condition_node["winner_team_id"] != reference_node.get(reference_field):
            return False, []

    resolved = [_resolve_source(source, nodes) for source in node.get("sources", [])]
    if len(resolved) != 2 or not all(ready for ready, _ in resolved):
        return False, []
    team_ids = [int(team_id) for _, team_id in resolved if team_id is not None]
    return len(team_ids) == 2 and team_ids[0] != team_ids[1], team_ids


def _materialize_graph_matches(league: League, state: dict, match_repo: MatchRepository) -> list[Match]:
    nodes = state.get("nodes", {})
    _apply_graph_reseeding(league, state)
    created: list[Match] = []
    for node in sorted(nodes.values(), key=lambda item: (int(item.get("order", 0)), str(item.get("key", "")))):
        ready, team_ids = _graph_node_ready(node, nodes)
        if not ready or node.get("match_id") is not None:
            continue
        node["team_a_id"], node["team_b_id"] = team_ids
        created.append(_create_match(league, node, match_repo, list(state.get("ordered_team_ids", []))))
    return created


def _apply_graph_reseeding(league: League, state: dict) -> None:
    if (
        str(getattr(league, "competition_type", "")) == "ELIMINATION"
        or not bool(getattr(league, "final_phase_reseed_each_round", False))
    ):
        return
    nodes = state.get("nodes", {})
    main_rounds = sorted({int(node["round"]) for node in nodes.values() if node.get("path") == "MAIN"})
    seed_rank = {int(team_id): index for index, team_id in enumerate(state.get("ordered_team_ids", []))}
    for round_number in main_rounds:
        if round_number <= 1:
            continue
        previous_nodes = [node for node in nodes.values() if node.get("path") == "MAIN" and int(node["round"]) == round_number - 1]
        current_nodes = sorted(
            [node for node in nodes.values() if node.get("path") == "MAIN" and int(node["round"]) == round_number],
            key=lambda node: int(node["slot"]),
        )
        if not previous_nodes or not all(node.get("winner_team_id") for node in previous_nodes):
            continue
        source_by_winner = {int(node["winner_team_id"]): str(node["key"]) for node in previous_nodes}
        ordered_winners = sorted(source_by_winner, key=lambda team_id: seed_rank.get(team_id, len(seed_rank)))
        for index, node in enumerate(current_nodes):
            if node.get("match_id") is not None:
                continue
            node["sources"] = [
                _outcome_source(source_by_winner[ordered_winners[index]]),
                _outcome_source(source_by_winner[ordered_winners[-(index + 1)]]),
            ]


def _single_main_nodes(
    league: League,
    participant_sources: list[dict],
    *,
    path: str = "MAIN",
    key_prefix: str = "M",
    order_offset: int = 0,
) -> tuple[dict[str, dict], str]:
    size = len(participant_sources)
    rounds = int(log2(size))
    seed_order = build_seed_order(size)
    nodes: dict[str, dict] = {}
    previous_keys: list[str] = []
    round_keys: dict[int, list[str]] = {}
    for slot in range(1, size // 2 + 1):
        key = f"{key_prefix}:1:{slot}"
        sources = [participant_sources[seed_order[(slot - 1) * 2] - 1], participant_sources[seed_order[(slot - 1) * 2 + 1] - 1]]
        nodes[key] = _new_node(
            league,
            key=key,
            path=path,
            size=size,
            round_number=1,
            slot=slot,
            title=f"{round_name(size, 1)} {slot}",
            sources=sources,
            order=order_offset + 1,
            is_final=rounds == 1,
        )
        previous_keys.append(key)
    round_keys[1] = list(previous_keys)
    for round_number in range(2, rounds + 1):
        current_keys: list[str] = []
        for slot in range(1, size // (2 ** round_number) + 1):
            key = f"{key_prefix}:{round_number}:{slot}"
            nodes[key] = _new_node(
                league,
                key=key,
                path=path,
                size=size,
                round_number=round_number,
                slot=slot,
                title=f"{round_name(size, round_number)} {slot}",
                sources=[_outcome_source(previous_keys[(slot - 1) * 2]), _outcome_source(previous_keys[(slot - 1) * 2 + 1])],
                order=order_offset + round_number,
                is_final=round_number == rounds,
            )
            current_keys.append(key)
        previous_keys = current_keys
        round_keys[round_number] = list(current_keys)
    if bool(getattr(league, "final_phase_third_place_match", False)) and rounds >= 2:
        semifinal_keys = round_keys[rounds - 1]
        third_place_key = f"{key_prefix}:TP:1"
        nodes[third_place_key] = _new_node(
            league,
            key=third_place_key,
            path="THIRD_PLACE",
            size=size,
            round_number=1,
            slot=1,
            title="Partido por el tercer lugar",
            sources=[_outcome_source(semifinal_keys[0], "LOSER"), _outcome_source(semifinal_keys[1], "LOSER")],
            order=order_offset + rounds,
            is_third_place=True,
        )
    return nodes, previous_keys[0]


def _build_play_in_state(league: League, ordered_team_ids: list[int], match_repo: MatchRepository) -> tuple[dict, list[Match]]:
    play_in_slots = int(league.final_phase_play_in_slots or 0)
    direct_count = len(ordered_team_ids) - play_in_slots
    main_size = direct_count + play_in_slots // 2
    if main_size < 2 or (main_size & (main_size - 1)) != 0:
        raise ValidationException("El play-in debe dejar una cantidad potencia de 2 para la llave principal.")

    nodes: dict[str, dict] = {}
    play_in_ids = ordered_team_ids[direct_count:]
    qualifier_sources: list[dict] = []
    if play_in_slots == 4:
        high_key, low_key, decider_key = "PI:1:1", "PI:1:2", "PI:2:1"
        nodes[high_key] = _new_node(league, key=high_key, path="PLAY_IN", size=4, round_number=1, slot=1, title="Play-In por el primer pase", sources=[_team_source(play_in_ids[0]), _team_source(play_in_ids[1])], order=1, force_single=True)
        nodes[low_key] = _new_node(league, key=low_key, path="PLAY_IN", size=4, round_number=1, slot=2, title="Play-In de eliminacion", sources=[_team_source(play_in_ids[2]), _team_source(play_in_ids[3])], order=1, force_single=True)
        nodes[decider_key] = _new_node(league, key=decider_key, path="PLAY_IN", size=4, round_number=2, slot=1, title="Play-In por el ultimo pase", sources=[_outcome_source(high_key, "LOSER"), _outcome_source(low_key)], order=2, force_single=True)
        qualifier_sources = [_outcome_source(high_key), _outcome_source(decider_key)]
    else:
        for index in range(play_in_slots // 2):
            key = f"PI:1:{index + 1}"
            nodes[key] = _new_node(
                league,
                key=key,
                path="PLAY_IN",
                size=play_in_slots,
                round_number=1,
                slot=index + 1,
                title=f"Play-In {index + 1}",
                sources=[_team_source(play_in_ids[index]), _team_source(play_in_ids[-(index + 1)])],
                order=1,
                force_single=True,
            )
            qualifier_sources.append(_outcome_source(key))

    main_sources = [_team_source(team_id) for team_id in ordered_team_ids[:direct_count]] + qualifier_sources
    main_nodes, final_key = _single_main_nodes(league, main_sources, order_offset=2)
    play_in_dependencies = [str(source["node_key"]) for source in qualifier_sources]
    for node in main_nodes.values():
        if int(node["round"]) == 1:
            node["requires"] = play_in_dependencies
    nodes.update(main_nodes)
    state = {
        "version": 3,
        "format": "PLAY_IN_PLUS_BRACKET",
        "size": main_size,
        "ordered_team_ids": ordered_team_ids,
        "champion_team_id": None,
        "champion_node_key": final_key,
        "nodes": nodes,
    }
    return state, _materialize_graph_matches(league, state, match_repo)


def _build_double_elimination_state(league: League, ordered_team_ids: list[int], match_repo: MatchRepository) -> tuple[dict, list[Match]]:
    size = len(ordered_team_ids)
    if size < 2 or (size & (size - 1)) != 0:
        raise ValidationException("La doble eliminacion requiere una cantidad potencia de 2 en equipos clasificados.")
    rounds = int(log2(size))
    seed_order = build_seed_order(size)
    nodes: dict[str, dict] = {}
    winners_by_round: dict[int, list[str]] = {1: []}

    for slot in range(1, size // 2 + 1):
        key = f"W:1:{slot}"
        nodes[key] = _new_node(
            league,
            key=key,
            path="WINNERS",
            size=size,
            round_number=1,
            slot=slot,
            title=f"Ganadores - {round_name(size, 1)} {slot}",
            sources=[_team_source(ordered_team_ids[seed_order[(slot - 1) * 2] - 1]), _team_source(ordered_team_ids[seed_order[(slot - 1) * 2 + 1] - 1])],
            order=1,
        )
        winners_by_round[1].append(key)

    for round_number in range(2, rounds + 1):
        winners_by_round[round_number] = []
        previous = winners_by_round[round_number - 1]
        for slot in range(1, size // (2 ** round_number) + 1):
            key = f"W:{round_number}:{slot}"
            nodes[key] = _new_node(
                league,
                key=key,
                path="WINNERS",
                size=size,
                round_number=round_number,
                slot=slot,
                title=f"Ganadores - {round_name(size, round_number)} {slot}",
                sources=[_outcome_source(previous[(slot - 1) * 2]), _outcome_source(previous[(slot - 1) * 2 + 1])],
                order=round_number * 2 - 1,
            )
            winners_by_round[round_number].append(key)

    if size == 2:
        lower_final_key = winners_by_round[1][0]
        lower_source = _outcome_source(lower_final_key, "LOSER")
        lower_order = 2
    else:
        lower_round = 1
        previous_lower: list[str] = []
        for slot in range(1, size // 4 + 1):
            key = f"L:{lower_round}:{slot}"
            nodes[key] = _new_node(
                league,
                key=key,
                path="LOSERS",
                size=size,
                round_number=lower_round,
                slot=slot,
                title=f"Perdedores - Ronda {lower_round}, cruce {slot}",
                sources=[_outcome_source(winners_by_round[1][(slot - 1) * 2], "LOSER"), _outcome_source(winners_by_round[1][(slot - 1) * 2 + 1], "LOSER")],
                order=2,
            )
            previous_lower.append(key)

        for winners_round in range(2, rounds + 1):
            lower_round += 1
            minor_keys: list[str] = []
            for slot, winners_key in enumerate(winners_by_round[winners_round], start=1):
                key = f"L:{lower_round}:{slot}"
                nodes[key] = _new_node(
                    league,
                    key=key,
                    path="LOSERS",
                    size=size,
                    round_number=lower_round,
                    slot=slot,
                    title=f"Perdedores - Ronda {lower_round}, cruce {slot}",
                    sources=[_outcome_source(previous_lower[slot - 1]), _outcome_source(winners_key, "LOSER")],
                    order=winners_round * 2,
                )
                minor_keys.append(key)
            previous_lower = minor_keys
            if winners_round < rounds:
                lower_round += 1
                major_keys: list[str] = []
                for slot in range(1, len(previous_lower) // 2 + 1):
                    key = f"L:{lower_round}:{slot}"
                    nodes[key] = _new_node(
                        league,
                        key=key,
                        path="LOSERS",
                        size=size,
                        round_number=lower_round,
                        slot=slot,
                        title=f"Perdedores - Ronda {lower_round}, cruce {slot}",
                        sources=[_outcome_source(previous_lower[(slot - 1) * 2]), _outcome_source(previous_lower[(slot - 1) * 2 + 1])],
                        order=winners_round * 2 + 1,
                    )
                    major_keys.append(key)
                previous_lower = major_keys
        lower_final_key = previous_lower[0]
        lower_source = _outcome_source(lower_final_key)
        lower_order = rounds * 2 + 1

    winners_final_key = winners_by_round[rounds][0]
    grand_final_key = "GF:1:1"
    nodes[grand_final_key] = _new_node(
        league,
        key=grand_final_key,
        path="GRAND_FINAL",
        size=size,
        round_number=1,
        slot=1,
        title="Gran final",
        sources=[_outcome_source(winners_final_key), lower_source],
        order=lower_order + 1,
        is_final=True,
    )
    champion_node_key = grand_final_key
    if bool(league.final_phase_grand_final_reset):
        reset_key = "GF:2:1"
        reset_node = _new_node(
            league,
            key=reset_key,
            path="GRAND_FINAL",
            size=size,
            round_number=2,
            slot=1,
            title="Reinicio de gran final",
            sources=[_outcome_source(winners_final_key), lower_source],
            order=lower_order + 2,
            is_final=True,
        )
        reset_node["conditional"] = {
            "node_key": grand_final_key,
            "reference_node_key": lower_final_key,
            "reference_outcome": "LOSER" if size == 2 else "WINNER",
        }
        nodes[reset_key] = reset_node
        champion_node_key = reset_key

    state = {
        "version": 3,
        "format": "DOUBLE_ELIMINATION",
        "size": size,
        "ordered_team_ids": ordered_team_ids,
        "champion_team_id": None,
        "champion_node_key": champion_node_key,
        "grand_final_key": grand_final_key,
        "winners_final_key": winners_final_key,
        "lower_final_key": lower_final_key,
        "grand_final_reset": bool(league.final_phase_grand_final_reset),
        "nodes": nodes,
    }
    return state, _materialize_graph_matches(league, state, match_repo)


def _build_single_elimination_state(league: League, ordered_team_ids: list[int], match_repo: MatchRepository) -> tuple[dict, list[Match]]:
    size = next_power_of_two(len(ordered_team_ids))
    team_by_seed = {seed: team_id for seed, team_id in enumerate(ordered_team_ids, start=1)}
    ordered_slots = build_seed_order(size)
    total_rounds = int(log2(size))
    nodes: dict[str, dict] = {}
    created: list[Match] = []
    for slot in range(1, size // 2 + 1):
        seed_a = ordered_slots[(slot - 1) * 2]
        seed_b = ordered_slots[(slot - 1) * 2 + 1]
        team_a_id = team_by_seed.get(seed_a)
        team_b_id = team_by_seed.get(seed_b)
        series_mode, series_best_of = _series_settings(league, is_final=total_rounds == 1)
        node = {
            "round": 1, "slot": slot, "bracket_size": size, "team_a_id": team_a_id, "team_b_id": team_b_id,
            "match_id": None, "match_ids": [], "winner_team_id": team_a_id if team_a_id and not team_b_id else team_b_id if team_b_id and not team_a_id else None,
            "series_mode": series_mode, "series_best_of": series_best_of, "path": "MAIN",
        }
        nodes[f"1:{slot}"] = node
        if team_a_id and team_b_id:
            created.append(_create_match(league, node, match_repo, ordered_team_ids))
    for round_number in range(2, total_rounds + 1):
        for slot in range(1, size // (2 ** round_number) + 1):
            series_mode, series_best_of = _series_settings(league, is_final=round_number == total_rounds)
            nodes[f"{round_number}:{slot}"] = {
                "round": round_number, "slot": slot, "bracket_size": size, "team_a_id": None, "team_b_id": None,
                "match_id": None, "match_ids": [], "winner_team_id": None, "series_mode": series_mode,
                "series_best_of": series_best_of, "path": "MAIN",
            }
    if bool(getattr(league, "final_phase_third_place_match", False)) and total_rounds >= 2:
        series_mode, series_best_of = _series_settings(league)
        nodes[f"{total_rounds}:2"] = {
            "round": total_rounds, "slot": 2, "bracket_size": size, "team_a_id": None, "team_b_id": None,
            "match_id": None, "match_ids": [], "winner_team_id": None, "loser_team_id": None,
            "series_mode": series_mode, "series_best_of": series_best_of, "path": "THIRD_PLACE",
            "title": "Partido por el tercer lugar", "is_third_place": True,
        }
    state = {"version": 2, "format": "SINGLE_ELIMINATION", "size": size, "ordered_team_ids": ordered_team_ids, "champion_team_id": None, "nodes": nodes}
    created.extend(_materialize_single_matches(league, state, match_repo))
    return state, created


def build_bracket_state(league: League, ordered_team_ids: list[int], match_repo: MatchRepository) -> tuple[dict, list[Match]]:
    bracket_format = str(getattr(league, "final_phase_format", "SINGLE_ELIMINATION"))
    if bracket_format == "PLAY_IN_PLUS_BRACKET":
        return _build_play_in_state(league, ordered_team_ids, match_repo)
    if bracket_format == "DOUBLE_ELIMINATION":
        return _build_double_elimination_state(league, ordered_team_ids, match_repo)
    return _build_single_elimination_state(league, ordered_team_ids, match_repo)


def expected_manual_draft_count(league: League, team_count: int) -> int:
    bracket_format = str(getattr(league, "final_phase_format", "SINGLE_ELIMINATION"))
    if bracket_format != "SINGLE_ELIMINATION":
        raise ValidationException("Los cruces manuales iniciales solo aplican a la eliminacion directa simple.")
    return max(0, team_count - next_power_of_two(team_count) // 2)


def _order_teams_for_manual_drafts(league: League, team_ids: list[int], draft_matches: list[Match]) -> list[int]:
    bracket_format = str(getattr(league, "final_phase_format", "SINGLE_ELIMINATION"))
    ordered_drafts = sorted(draft_matches, key=lambda item: int(item.id))
    used_ids = {int(team_id) for match in ordered_drafts for team_id in (match.team_a_id, match.team_b_id)}
    remaining_ids = [int(team_id) for team_id in team_ids if int(team_id) not in used_ids]

    if bracket_format != "SINGLE_ELIMINATION":
        raise ValidationException("Los cruces manuales iniciales solo aplican a la eliminacion directa simple.")
    bracket_size = next_power_of_two(len(team_ids))
    seed_order = build_seed_order(bracket_size)
    full_pair_seeds = [
        (seed_order[index], seed_order[index + 1])
        for index in range(0, len(seed_order), 2)
        if seed_order[index] <= len(team_ids) and seed_order[index + 1] <= len(team_ids)
    ]
    team_by_seed: dict[int, int] = {}
    for match, (seed_a, seed_b) in zip(ordered_drafts, full_pair_seeds, strict=True):
        team_by_seed[seed_a] = int(match.team_a_id)
        team_by_seed[seed_b] = int(match.team_b_id)
    for seed, team_id in zip((seed for seed in range(1, len(team_ids) + 1) if seed not in team_by_seed), remaining_ids, strict=True):
        team_by_seed[seed] = team_id
    return [team_by_seed[seed] for seed in range(1, len(team_ids) + 1)]


def build_bracket_state_from_drafts(
    league: League,
    team_ids: list[int],
    draft_matches: list[Match],
    match_repo: MatchRepository,
) -> tuple[dict, list[Match]]:
    expected_count = expected_manual_draft_count(league, len(team_ids))
    if len(draft_matches) != expected_count:
        raise ValidationException(
            f"Debes definir exactamente {expected_count} cruce(s) inicial(es) antes de cerrar la llave."
        )

    draft_team_ids = [int(team_id) for match in draft_matches for team_id in (match.team_a_id, match.team_b_id)]
    if len(draft_team_ids) != len(set(draft_team_ids)):
        raise ValidationException("Un equipo no puede aparecer en dos cruces manuales de la primera ronda.")
    if any(
        str(match.status) != MatchStatus.SCHEDULED.value
        or match.score_team_a is not None
        or match.score_team_b is not None
        or match.winner_team_id is not None
        for match in draft_matches
    ):
        raise ValidationException("Los cruces manuales deben seguir programados y sin marcador antes de cerrar la llave.")

    ordered_team_ids = _order_teams_for_manual_drafts(league, team_ids, draft_matches)
    state, generated_matches = build_bracket_state(league, ordered_team_ids, match_repo)
    generated_by_pair = {
        frozenset((int(match.team_a_id), int(match.team_b_id))): match
        for match in generated_matches
    }
    adopted_matches: list[Match] = []
    generated_ids_to_remove: set[int] = set()
    for draft in sorted(draft_matches, key=lambda item: int(item.id)):
        generated = generated_by_pair.get(frozenset((int(draft.team_a_id), int(draft.team_b_id))))
        if generated is None:
            raise ValidationException("Los cruces manuales no son compatibles con la primera ronda configurada.")
        match_repo.update(
            draft,
            tracked_stats=list(league.tracked_stats or []),
            competition_stage="FINAL_PHASE",
            group_stage_group_key=None,
            bracket_round=generated.bracket_round,
            bracket_slot=generated.bracket_slot,
            bracket_size=generated.bracket_size,
            bracket_game=generated.bracket_game,
            bracket_series_mode=generated.bracket_series_mode,
            bracket_series_best_of=generated.bracket_series_best_of,
            bracket_path=generated.bracket_path,
            tournament=generated.tournament,
        )
        generated_id = int(generated.id)
        generated_ids_to_remove.add(generated_id)
        for node in state.get("nodes", {}).values():
            node_match_ids = [int(match_id) for match_id in node.get("match_ids", [])]
            if generated_id not in node_match_ids:
                continue
            node["match_ids"] = [int(draft.id) if match_id == generated_id else match_id for match_id in node_match_ids]
            if int(node.get("match_id") or 0) == generated_id:
                node["match_id"] = int(draft.id)
            break
        adopted_matches.append(draft)

    for generated in generated_matches:
        if int(generated.id) in generated_ids_to_remove:
            match_repo.delete(generated)
    remaining_generated = [match for match in generated_matches if int(match.id) not in generated_ids_to_remove]
    return state, [*adopted_matches, *remaining_generated]


def _materialize_single_matches(league: League, state: dict, match_repo: MatchRepository) -> list[Match]:
    nodes = state.get("nodes", {})
    size = int(state.get("size", 0))
    total_rounds = int(log2(size)) if size >= 2 else 0
    created: list[Match] = []
    for round_number in range(2, total_rounds + 1):
        for slot in range(1, size // (2 ** round_number) + 1):
            node = nodes[f"{round_number}:{slot}"]
            if (
                str(getattr(league, "competition_type", "")) != "ELIMINATION"
                and bool(getattr(league, "final_phase_reseed_each_round", False))
            ):
                previous_nodes = [nodes[f"{round_number - 1}:{previous_slot}"] for previous_slot in range(1, size // (2 ** (round_number - 1)) + 1)]
                if not all(previous.get("winner_team_id") for previous in previous_nodes):
                    continue
                seed_rank = {int(team_id): index for index, team_id in enumerate(state.get("ordered_team_ids", []))}
                ordered_winners = sorted((int(previous["winner_team_id"]) for previous in previous_nodes), key=lambda team_id: seed_rank.get(team_id, len(seed_rank)))
                node["team_a_id"] = ordered_winners[slot - 1]
                node["team_b_id"] = ordered_winners[-slot]
            else:
                left = nodes[f"{round_number - 1}:{slot * 2 - 1}"]
                right = nodes[f"{round_number - 1}:{slot * 2}"]
                node["team_a_id"] = left.get("winner_team_id")
                node["team_b_id"] = right.get("winner_team_id")
            if node.get("match_id") is None and node["team_a_id"] and node["team_b_id"]:
                created.append(_create_match(league, node, match_repo, list(state.get("ordered_team_ids", []))))
    third_place_node = nodes.get(f"{total_rounds}:2")
    if third_place_node and third_place_node.get("match_id") is None:
        semifinal_round = total_rounds - 1
        semifinal_nodes = [nodes.get(f"{semifinal_round}:{slot}") for slot in (1, 2)]
        if all(node and node.get("loser_team_id") for node in semifinal_nodes):
            third_place_node["team_a_id"] = semifinal_nodes[0]["loser_team_id"]
            third_place_node["team_b_id"] = semifinal_nodes[1]["loser_team_id"]
            created.append(_create_match(league, third_place_node, match_repo, list(state.get("ordered_team_ids", []))))
    return created


def _resolve_series(league: League, node: dict, match_repo: MatchRepository) -> tuple[int | None, list[Match]]:
    node_match_ids = list(node.get("match_ids", [])) or ([node.get("match_id")] if node.get("match_id") else [])
    node["match_ids"] = node_match_ids
    node.setdefault("series_mode", "SINGLE")
    node.setdefault("series_best_of", 1)
    series_matches = sorted(match_repo.list_by_ids([int(match_id) for match_id in node_match_ids]), key=lambda item: int(getattr(item, "bracket_game", 1) or 1))
    finished = [item for item in series_matches if item.status == MatchStatus.FINISHED.value and item.winner_team_id]
    created: list[Match] = []
    if node["series_mode"] == "TWO_LEGS":
        base_team_a_id = int(node["team_a_id"])
        base_team_b_id = int(node["team_b_id"])
        if len(finished) < 2:
            return None, created
        totals = {base_team_a_id: 0, base_team_b_id: 0}
        for item in finished[:2]:
            totals[int(item.team_a_id)] += int(item.score_team_a or 0)
            totals[int(item.team_b_id)] += int(item.score_team_b or 0)
        if totals[base_team_a_id] != totals[base_team_b_id]:
            winner = base_team_a_id if totals[base_team_a_id] > totals[base_team_b_id] else base_team_b_id
            return winner, created
        if len(finished) >= 3:
            return int(finished[2].winner_team_id), created
        if len(series_matches) < 3:
            created.append(_create_match(league, node, match_repo, list((league.bracket_state or {}).get("ordered_team_ids", []))))
        return None, created

    wins: dict[int, int] = {}
    for item in finished:
        winner_id = int(item.winner_team_id)
        wins[winner_id] = wins.get(winner_id, 0) + 1
    required_wins = int(node["series_best_of"]) // 2 + 1
    winner_team_id = next((team_id for team_id, count in wins.items() if count >= required_wins), None)
    if winner_team_id is None and len(finished) == len(series_matches) and len(series_matches) < int(node["series_best_of"]):
        created.append(_create_match(league, node, match_repo, list((league.bracket_state or {}).get("ordered_team_ids", []))))
    return winner_team_id, created


def _has_materialized_dependent(node_key: str, nodes: dict[str, dict]) -> bool:
    for candidate in nodes.values():
        references = any(source.get("node_key") == node_key for source in candidate.get("sources", []))
        conditional_reference = candidate.get("conditional", {}).get("node_key") == node_key
        if (references or conditional_reference) and candidate.get("match_id") is not None:
            return True
    return False


def _advance_graph_bracket(league: League, match: Match, state: dict, match_repo: MatchRepository) -> list[Match]:
    nodes = {key: dict(value) for key, value in state.get("nodes", {}).items()}
    state["nodes"] = nodes
    node_key = next((key for key, node in nodes.items() if int(match.id) in {int(item) for item in node.get("match_ids", [])}), None)
    if not node_key:
        return []
    node = nodes[node_key]
    previous_winner = node.get("winner_team_id")
    winner_team_id, created = _resolve_series(league, node, match_repo)
    if previous_winner != winner_team_id and _has_materialized_dependent(node_key, nodes):
        raise ValidationException("No puedes cambiar el ganador porque ya se genero un cruce dependiente. Reinicia la llave para corregirlo.")
    node["winner_team_id"] = winner_team_id
    if winner_team_id is not None:
        node["loser_team_id"] = int(node["team_b_id"]) if winner_team_id == int(node["team_a_id"]) else int(node["team_a_id"])
    else:
        node["loser_team_id"] = None

    if state.get("format") == "DOUBLE_ELIMINATION" and node_key == state.get("grand_final_key") and winner_team_id:
        lower_final = nodes[str(state["lower_final_key"])]
        lower_team_id = lower_final.get("loser_team_id") if int(state["size"]) == 2 else lower_final.get("winner_team_id")
        if not state.get("grand_final_reset") or winner_team_id != lower_team_id:
            state["champion_team_id"] = winner_team_id
    elif node_key == state.get("champion_node_key") and winner_team_id:
        state["champion_team_id"] = winner_team_id

    third_place_nodes = [item for item in nodes.values() if item.get("is_third_place")]
    if state.get("champion_team_id") and all(item.get("winner_team_id") for item in third_place_nodes):
        league.status = "Finalizada"

    created.extend(_materialize_graph_matches(league, state, match_repo))
    league.bracket_state = state
    match_repo.db.flush()
    return created


def advance_bracket_match(league: League, match: Match, previous_winner_team_id: int | None, match_repo: MatchRepository) -> list[Match]:
    state = dict(league.bracket_state or {})
    if not state or match.bracket_round is None or match.bracket_slot is None:
        return []
    if int(state.get("version", 2)) >= 3:
        return _advance_graph_bracket(league, match, state, match_repo)

    nodes = {key: dict(value) for key, value in state.get("nodes", {}).items()}
    state["nodes"] = nodes
    node_key = f"{match.bracket_round}:{match.bracket_slot}"
    node = nodes.get(node_key)
    if not node or int(match.id) not in {int(item) for item in node.get("match_ids", [])}:
        return []
    previous_series_winner = node.get("winner_team_id")
    series_winner_team_id, created = _resolve_series(league, node, match_repo)
    next_round = int(match.bracket_round) + 1
    next_slot = (int(match.bracket_slot) + 1) // 2
    next_node = nodes.get(f"{next_round}:{next_slot}")
    if previous_series_winner != series_winner_team_id and next_node and next_node.get("match_id"):
        raise ValidationException("No puedes cambiar el ganador porque el siguiente cruce ya fue generado. Reinicia la llave para corregirlo.")
    node["winner_team_id"] = series_winner_team_id
    if series_winner_team_id is not None:
        node["loser_team_id"] = int(node["team_b_id"]) if series_winner_team_id == int(node["team_a_id"]) else int(node["team_a_id"])
    else:
        node["loser_team_id"] = None
    if not node.get("is_third_place") and int(match.bracket_round) == int(log2(int(state["size"]))) and int(match.bracket_slot) == 1 and series_winner_team_id:
        state["champion_team_id"] = series_winner_team_id
    third_place_nodes = [item for item in nodes.values() if item.get("is_third_place")]
    if state.get("champion_team_id") and all(item.get("winner_team_id") for item in third_place_nodes):
        league.status = "Finalizada"
    created.extend(_materialize_single_matches(league, state, match_repo))
    league.bracket_state = state
    match_repo.db.flush()
    return created
