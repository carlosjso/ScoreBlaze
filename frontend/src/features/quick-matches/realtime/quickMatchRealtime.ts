import type {
  QuickMatchStatsEvent,
  QuickMatchStatsEventType,
  QuickMatchStatsSnapshot,
  QuickMatchStatsTeamSnapshot,
} from "@/features/quick-matches/QuickMatchStats.service";
import {
  getMatchResultLabel,
  type QuickMatchListItem,
} from "@/features/quick-matches/QuickMatches.types";
import type {
  ScoreboardHistoryEvent,
  ScoreboardState,
  ScoreboardTeamState,
} from "@/features/scoreboard/Scoreboard.types";

const scoreboardEventTypeMap: Record<
  ScoreboardHistoryEvent["type"],
  QuickMatchStatsEventType
> = {
  POINT_1: "point_1",
  POINT_2: "point_2",
  POINT_3: "point_3",
  ASSIST: "assist",
  MISSED_SHOT: "miss",
  REBOUND: "rebound",
  FOUL: "foul",
};

function resolveMatchResult(scoreTeamA: number, scoreTeamB: number, teamAId: number, teamBId: number) {
  if (scoreTeamA === scoreTeamB) {
    return {
      winnerTeamId: null,
      isDraw: true,
    };
  }

  return {
    winnerTeamId: scoreTeamA > scoreTeamB ? teamAId : teamBId,
    isDraw: false,
  };
}

function toStatsTeamSnapshot(
  team: ScoreboardTeamState,
  fallback: QuickMatchStatsTeamSnapshot,
): QuickMatchStatsTeamSnapshot {
  return {
    id: team.id ?? fallback.id,
    key: fallback.key,
    name: team.name || fallback.name,
    logo_base64: team.logo ?? fallback.logo_base64,
    score: team.score,
    fouls: team.fouls,
    players:
      team.players.length > 0
        ? team.players.map((player) => ({
            id: player.playerId ?? null,
            name: player.name,
            shirt_number: player.shirtNumber,
            label: player.label,
          }))
        : fallback.players,
  };
}

function toStatsEvent(
  event: ScoreboardHistoryEvent,
  index: number,
  fallbackTeamId: number,
): QuickMatchStatsEvent {
  return {
    id: event.backendEventId ?? index + 1,
    team_key: event.team,
    team_id: event.teamId ?? fallbackTeamId,
    player_id: event.playerId ?? null,
    guest_name: event.playerId === null ? event.player : null,
    event_type: scoreboardEventTypeMap[event.type],
    period: event.period,
    elapsed_seconds: event.elapsedSeconds,
    event_order: event.eventOrder,
    status: event.status ?? "active",
    created_at: new Date(event.createdAt).toISOString(),
  };
}

export function applyRealtimeScoreboardToQuickMatch(
  match: QuickMatchListItem,
  realtimeState: ScoreboardState,
): QuickMatchListItem {
  const scoreTeamA = realtimeState.teamA.score;
  const scoreTeamB = realtimeState.teamB.score;
  const { winnerTeamId, isDraw } = resolveMatchResult(
    scoreTeamA,
    scoreTeamB,
    match.teamAId,
    match.teamBId,
  );
  const teamAName = realtimeState.teamA.name || match.teamAName;
  const teamBName = realtimeState.teamB.name || match.teamBName;

  return {
    ...match,
    teamAName,
    teamBName,
    teamALogoBase64: realtimeState.teamA.logo ?? match.teamALogoBase64,
    teamBLogoBase64: realtimeState.teamB.logo ?? match.teamBLogoBase64,
    matchupLabel: `${teamAName} vs ${teamBName}`,
    scoreTeamA,
    scoreTeamB,
    scoreLabel: `${scoreTeamA} - ${scoreTeamB}`,
    winnerTeamId,
    isDraw,
    resultLabel: getMatchResultLabel({
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      teamAName,
      teamBName,
      scoreTeamA,
      scoreTeamB,
      winnerTeamId,
      isDraw,
    }),
  };
}

export function applyRealtimeScoreboardToQuickMatchStatsSnapshot(
  snapshot: QuickMatchStatsSnapshot,
  realtimeState: ScoreboardState,
): QuickMatchStatsSnapshot {
  const scoreTeamA = realtimeState.teamA.score;
  const scoreTeamB = realtimeState.teamB.score;
  const { winnerTeamId, isDraw } = resolveMatchResult(
    scoreTeamA,
    scoreTeamB,
    snapshot.match.team_a_id,
    snapshot.match.team_b_id,
  );

  return {
    match: {
      ...snapshot.match,
      score_team_a: scoreTeamA,
      score_team_b: scoreTeamB,
      winner_team_id: winnerTeamId,
      is_draw: isDraw,
    },
    team_a: toStatsTeamSnapshot(realtimeState.teamA, snapshot.team_a),
    team_b: toStatsTeamSnapshot(realtimeState.teamB, snapshot.team_b),
    events: realtimeState.history.map((event, index) =>
      toStatsEvent(
        event,
        index,
        event.team === "A" ? snapshot.team_a.id : snapshot.team_b.id,
      ),
    ),
  };
}
