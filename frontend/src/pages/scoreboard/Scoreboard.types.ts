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

export type ScoreboardHistoryEvent = {
  id: string;
  type: ScoreboardEventType;
  team: ScoreboardTeamKey;
  player: string;
  points?: number;
  text: string;
  period: number;
  elapsedSeconds: number;
  eventOrder: number;
  createdAt: number;
};

export type ScoreboardTeamState = {
  key: ScoreboardTeamKey;
  name: string;
  logo?: string;
  score: number;
  fouls: number;
  selectedPlayer: string | null;
  players: string[];
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
