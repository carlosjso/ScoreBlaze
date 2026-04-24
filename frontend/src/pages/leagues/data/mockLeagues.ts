import type { League } from "@/pages/leagues/types/league";

export const mockLeagues: League[] = [
  {
    id: 1,
    name: "Liga Municipal Primavera",
    category: "Basquet varonil",
    status: "En curso",
    startDate: "2026-04-12",
    endDate: "2026-08-12",
    teamIds: [1, 2, 4, 6],
  },
  {
    id: 2,
    name: "Liga Juvenil Apertura",
    category: "Sub-19 mixto",
    status: "Sin empezar",
    startDate: "2026-05-01",
    endDate: "2026-09-01",
    teamIds: [3, 5, 7, 8],
  },
  {
    id: 3,
    name: "Copa Regional Elite",
    category: "Basquet profesional",
    status: "Finalizada",
    startDate: "2025-11-02",
    endDate: "2026-03-20",
    teamIds: [1, 3, 5, 6],
  },
];
