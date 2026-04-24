import type { QuickMatch } from "@/pages/quick-matches/types/quickMatch";

export const mockQuickMatches: QuickMatch[] = [
  {
    id: 1,
    homeTeamId: 1,
    awayTeamId: 2,
    scheduledAt: "2026-05-03T20:00",
    status: "Programado",
    notes: "Amistoso de preparacion",
  },
  {
    id: 2,
    homeTeamId: 4,
    awayTeamId: 6,
    scheduledAt: "2026-05-08T19:30",
    status: "Programado",
    notes: "Partido nocturno",
  },
  {
    id: 3,
    homeTeamId: 3,
    awayTeamId: 5,
    scheduledAt: "2026-04-22T18:00",
    status: "Finalizado",
    notes: "Termino sin incidencias",
  },
];
