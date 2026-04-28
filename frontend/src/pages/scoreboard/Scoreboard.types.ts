export type ScoreboardTeamKey = "A" | "B";

export type ScoreboardControlMode = "buttons" | "keyboard";

export type ScoreboardEventType =
  | "POINT_1"
  | "POINT_2"
  | "POINT_3"
  | "ASSIST"
  | "MISSED_SHOT"
  | "REBOUND"
  | "FOUL";

export type ScoreboardEventStatus = "active" | "voided";

export type ScoreboardPlayerOption = {
  key: string;
  playerId: number | null;
  label: string;
  name: string;
  shirtNumber: string | null;
};

export type ScoreboardHistoryEvent = {
  id: string;
  type: ScoreboardEventType;
  team: ScoreboardTeamKey;
  teamId?: number;
  player: string;
  playerId?: number | null;
  points?: number;
  text: string;
  period: number;
  elapsedSeconds: number;
  eventOrder: number;
  createdAt: number;
  backendEventId?: number;
  status?: ScoreboardEventStatus;
};

export type ScoreboardTeamState = {
  id?: number;
  key: ScoreboardTeamKey;
  name: string;
  logo?: string;
  score: number;
  fouls: number;
  selectedPlayer: string | null;
  players: ScoreboardPlayerOption[];
};

export type ScoreboardState = {
  teamA: ScoreboardTeamState;
  teamB: ScoreboardTeamState;
  history: ScoreboardHistoryEvent[];
  arrow: ScoreboardTeamKey;
  controlMode: ScoreboardControlMode;
  period: number;
  clockSeconds: number;
  shotClockSeconds: number;
  clockRunning: boolean;
};
