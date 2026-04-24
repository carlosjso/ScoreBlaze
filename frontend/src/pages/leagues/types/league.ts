export type LeagueStatus = "En curso" | "Sin empezar" | "Finalizada";

export type League = {
  id: number;
  name: string;
  category: string;
  status: LeagueStatus;
  startDate: string;
  endDate: string;
  teamIds: number[];
};
