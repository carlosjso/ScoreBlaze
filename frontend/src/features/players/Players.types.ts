export type PlayerStatus = "Con equipo" | "Sin equipo";
export type SortKey = "id" | "name";
export type SortDir = "asc" | "desc";
export type TeamFilterValue = "all" | "none" | `${number}`;
export type PlayerFormMode = "create" | "edit";

export type ApiPlayer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  nationality: string | null;
  favorite_position: string | null;
  photo_base64: string | null;
};

export type ApiPlayerStat = {
  player_id: number;
  matches_played: number;
  total_points: number;
  made_1pt: number;
  made_2pt: number;
  made_3pt: number;
  missed_shots: number;
  total_assists: number;
  total_rebounds: number;
  total_fouls: number;
  tracked_made_shots: number | null;
  tracked_shot_attempts: number | null;
  shooting_accuracy: number | null;
  updated_at: string;
};

export type ApiTeam = {
  id: number;
  name: string;
  logo_base64: string | null;
};

export type ApiTeamMembership = {
  player_id: number;
  team_id: number;
  shirt_number: string | null;
};

export type PlayersSnapshot = {
  players: ApiPlayer[];
  teams: ApiTeam[];
  memberships: ApiTeamMembership[];
};

export type PlayerListItem = {
  id: number;
  name: string;
  email: string;
  phone: string;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  nationality: string;
  favoritePosition: string;
  photoBase64: string | null;
  teamIds: number[];
  teamNames: string[];
  teams: {
    id: number;
    name: string;
    logoBase64: string | null;
  }[];
  teamLabel: string;
  teamsCount: number;
  status: PlayerStatus;
};

export type PlayerStatsScope = "historical" | "league";

type PlayerDetailStatsBase = {
  scope: PlayerStatsScope;
  matchesPlayed: number;
  totalPoints: number;
  made1pt: number;
  made2pt: number;
  made3pt: number;
  missedShots: number;
  totalAssists: number;
  totalRebounds: number;
  totalFouls: number;
  averagePoints: number | null;
  averageAssists: number | null;
  averageRebounds: number | null;
  totalMadeShots: number | null;
  totalShotAttempts: number | null;
  shootingAccuracy: number | null;
};

export type PlayerHistoricalStats = PlayerDetailStatsBase & {
  scope: "historical";
  teamsCount: number;
  updatedAt: string | null;
};

export type PlayerLeagueStats = PlayerDetailStatsBase & {
  scope: "league";
  leagueName: string;
  teamName: string;
  teamMatchesPlayed: number;
  participationRate: number | null;
  rankingPosition: number | null;
};

export type PlayerDetailStats = PlayerHistoricalStats | PlayerLeagueStats;

export type PlayerFormValues = {
  name: string;
  email: string;
  phone: string;
  age: string;
  heightCm: string;
  weightKg: string;
  nationality: string;
  favoritePosition: string;
  photoBase64: string | null;
  teamIds: number[];
};

export type PlayerMutationPayload = {
  name: string;
  email: string;
  phone: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  nationality: string | null;
  favorite_position: string | null;
  photo_base64: string | null;
  team_ids: number[];
};

export function getPlayerStatus(teamIds: number[]): PlayerStatus {
  return teamIds.length > 0 ? "Con equipo" : "Sin equipo";
}
