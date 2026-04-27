export type PlayerStatus = "Con equipo" | "Sin equipo";
export type SortKey = "id" | "name";
export type SortDir = "asc" | "desc";
export type TeamFilterValue = "all" | "none" | `${number}`;
export type PlayerFormMode = "create" | "edit";

export type ApiPlayer = {
  id: number;
  name: string;
  email: string;
  phone: number | null;
  photo_base64: string | null;
};

export type ApiTeam = {
  id: number;
  name: string;
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
  photoBase64: string | null;
  teamIds: number[];
  teamNames: string[];
  teamLabel: string;
  teamsCount: number;
  status: PlayerStatus;
};

export type PlayerFormValues = {
  name: string;
  email: string;
  phone: string;
  photoBase64: string | null;
  teamIds: number[];
};

export type PlayerMutationPayload = {
  name: string;
  email: string;
  phone: number | null;
  photo_base64: string | null;
  team_ids: number[];
};

export function getPlayerStatus(teamIds: number[]): PlayerStatus {
  return teamIds.length > 0 ? "Con equipo" : "Sin equipo";
}
