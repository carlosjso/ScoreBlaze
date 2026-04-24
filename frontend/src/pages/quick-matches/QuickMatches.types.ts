export type MatchStatus = "scheduled" | "live" | "finished";
export type MatchResultOption = "pending" | "draw" | "team_a" | "team_b";
export type SortKey = "id" | "matchDate" | "status";
export type SortDir = "asc" | "desc";
export type MatchStatusFilter = "all" | MatchStatus;
export type MatchFormMode = "create" | "edit";

export type ApiTeamOption = {
  id: number;
  name: string;
};

export type ApiMatch = {
  id: number;
  match_date: string;
  start_time: string;
  end_time: string;
  team_a_id: number;
  team_b_id: number;
  score_team_a: number | null;
  score_team_b: number | null;
  winner_team_id: number | null;
  is_draw: boolean;
  court: string | null;
  tournament: string | null;
  status: MatchStatus;
};

export type QuickMatchesSnapshot = {
  matches: ApiMatch[];
  teams: ApiTeamOption[];
};

export type QuickMatchListItem = {
  id: number;
  teamAId: number;
  teamBId: number;
  teamAName: string;
  teamBName: string;
  matchupLabel: string;
  matchDate: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  timeLabel: string;
  scheduleLabel: string;
  scoreTeamA: number | null;
  scoreTeamB: number | null;
  scoreLabel: string;
  winnerTeamId: number | null;
  isDraw: boolean;
  resultLabel: string;
  court: string;
  tournament: string;
  venueLabel: string;
  status: MatchStatus;
  statusLabel: string;
};

export type QuickMatchFormValues = {
  teamAId: number;
  teamBId: number;
  matchDate: string;
  startTime: string;
  endTime: string;
  status: MatchStatus;
  scoreTeamA: string;
  scoreTeamB: string;
  result: MatchResultOption;
  court: string;
  tournament: string;
};

export type MatchMutationPayload = {
  match_date: string;
  start_time: string;
  end_time: string;
  team_a_id: number;
  team_b_id: number;
  score_team_a: number | null;
  score_team_b: number | null;
  winner_team_id: number | null;
  is_draw: boolean;
  court: string | null;
  tournament: string | null;
  status: MatchStatus;
};

const matchStatusLabels: Record<MatchStatus, string> = {
  scheduled: "Programado",
  live: "En juego",
  finished: "Finalizado",
};

export const matchStatusSortOrder: Record<MatchStatus, number> = {
  scheduled: 0,
  live: 1,
  finished: 2,
};

export function getMatchStatusLabel(status: MatchStatus): string {
  return matchStatusLabels[status];
}

export function getMatchResultOptionLabel(
  result: MatchResultOption,
  teamALabel = "Equipo A",
  teamBLabel = "Equipo B"
): string {
  switch (result) {
    case "draw":
      return "Empate";
    case "team_a":
      return `Gana ${teamALabel}`;
    case "team_b":
      return `Gana ${teamBLabel}`;
    default:
      return "Pendiente";
  }
}

export function getMatchResultLabel(match: {
  teamAId: number;
  teamBId: number;
  teamAName: string;
  teamBName: string;
  scoreTeamA: number | null;
  scoreTeamB: number | null;
  winnerTeamId: number | null;
  isDraw: boolean;
}): string {
  if (match.scoreTeamA !== null && match.scoreTeamB !== null) {
    if (match.scoreTeamA === match.scoreTeamB) {
      return "Empate";
    }

    return match.scoreTeamA > match.scoreTeamB ? `Gana ${match.teamAName}` : `Gana ${match.teamBName}`;
  }

  if (match.isDraw) {
    return "Empate";
  }

  if (match.winnerTeamId === match.teamAId) {
    return `Gana ${match.teamAName}`;
  }

  if (match.winnerTeamId === match.teamBId) {
    return `Gana ${match.teamBName}`;
  }

  return "Pendiente";
}

export function getMatchResultOptionFromApiMatch(
  match: Pick<ApiMatch, "team_a_id" | "team_b_id" | "winner_team_id" | "is_draw">
): MatchResultOption {
  if (match.is_draw) return "draw";
  if (match.winner_team_id === match.team_a_id) return "team_a";
  if (match.winner_team_id === match.team_b_id) return "team_b";
  return "pending";
}

export function formatMatchDate(value: string): string {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(date);
}

export function formatMatchTime(value: string): string {
  if (!value) return "-";
  return value.slice(0, 5);
}

export function formatMatchTimeRange(startTime: string, endTime: string): string {
  return `${formatMatchTime(startTime)} - ${formatMatchTime(endTime)}`;
}
