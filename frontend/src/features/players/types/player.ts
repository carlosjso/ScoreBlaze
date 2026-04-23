export type PlayerStatus = "Con equipo" | "Sin equipo";

export type Player = {
  id: number;
  name: string;
  email: string;
  phone: string;
  teamId: number | null;
  position: string;
};

export function getPlayerStatus(player: Pick<Player, "teamId">): PlayerStatus {
  return player.teamId === null ? "Sin equipo" : "Con equipo";
}
