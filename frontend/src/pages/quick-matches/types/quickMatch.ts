export type QuickMatchStatus = "Programado" | "En juego" | "Finalizado" | "Suspendido";

export type QuickMatch = {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  scheduledAt: string;
  status: QuickMatchStatus;
  notes: string;
};
