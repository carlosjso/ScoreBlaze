export type TeamRosterStatus = "Con jugadores" | "Sin jugadores";
export type SortKey = "id" | "name" | "players";
export type SortDir = "asc" | "desc";
export type TeamRosterFilter = "all" | "with_players" | "without_players";
export type TeamFormMode = "create" | "edit";

export type ApiTeam = {
  id: number;
  name: string;
  responsible_name: string | null;
  responsible_phone: string | null;
  responsible_email: string | null;
  logo_base64: string | null;
};

export type ApiPlayer = {
  id: number;
  name: string;
  email: string;
  phone: number | null;
};

export type ApiTeamMembership = {
  player_id: number;
  team_id: number;
  shirt_number: string | null;
};

export type TeamsSnapshot = {
  teams: ApiTeam[];
  players: ApiPlayer[];
  memberships: ApiTeamMembership[];
};

export type TeamPlayerSummary = {
  id: number;
  name: string;
  email: string;
  phone: string;
};

export type TeamListItem = {
  id: number;
  name: string;
  responsibleName: string;
  responsiblePhone: string;
  responsibleEmail: string;
  logoBase64: string | null;
  playerIds: number[];
  playerCount: number;
  players: TeamPlayerSummary[];
  playersLabel: string;
  rosterStatus: TeamRosterStatus;
};

export type TeamFormValues = {
  name: string;
  responsibleName: string;
  responsiblePhone: string;
  responsibleEmail: string;
  logoBase64: string | null;
  playerIds: number[];
};

export type TeamMutationPayload = {
  name: string;
  responsible_name: string;
  responsible_phone: string;
  responsible_email: string;
  logo_base64: string | null;
  player_ids: number[];
};

export function getTeamRosterStatus(playerIds: number[]): TeamRosterStatus {
  return playerIds.length > 0 ? "Con jugadores" : "Sin jugadores";
}
