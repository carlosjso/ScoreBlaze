import { Dribbble, Shield, Trophy, UsersRound, House } from "lucide-react";
import type { ReactNode } from "react";

import BasketballHubPage from "@/features/basketball/pages/BasketballHubPage";
import LeaguesPage from "@/features/leagues/pages/LeaguesPage";
import TeamPlayersPage from "@/features/players/pages/TeamPlayersPage";
import QuickMatchesPage from "@/features/quick-matches/pages/QuickMatchesPage";
import SportDashboardPage from "@/features/sports/pages/SportDashboardPage";
import SportsPage from "@/features/sports/pages/SportsPage";
import TeamsPage from "@/features/teams/pages/TeamsPage";

export type SidebarContext = "home" | "basketball" | "none";

export type AppRoute = {
  path: string;
  element: ReactNode;
  label: string;
  icon: ReactNode;
  sidebarContext: SidebarContext;
};

export const routes: AppRoute[] = [
  {
    path: "/dashboard",
    element: <SportsPage />,
    label: "Dashboard",
    icon: <House size={16} />,
    sidebarContext: "home",
  },
  {
    path: "/basketball",
    element: <BasketballHubPage />,
    label: "Basquet",
    icon: <Dribbble size={16} />,
    sidebarContext: "none",
  },
  {
    path: "/team-players",
    element: <TeamPlayersPage />,
    label: "Jugadores",
    icon: <UsersRound size={16} />,
    sidebarContext: "basketball",
  },
  {
    path: "/teams",
    element: <TeamsPage />,
    label: "Equipos",
    icon: <Shield size={16} />,
    sidebarContext: "basketball",
  },
  {
    path: "/quick-match",
    element: <QuickMatchesPage />,
    label: "Partido rapido",
    icon: <Dribbble size={16} />,
    sidebarContext: "basketball",
  },
  {
    path: "/leagues",
    element: <LeaguesPage />,
    label: "Ligas",
    icon: <Trophy size={16} />,
    sidebarContext: "basketball",
  },
  {
    path: "/football",
    element: <SportDashboardPage sport="Futbol" />,
    label: "Futbol",
    icon: <Dribbble size={16} />,
    sidebarContext: "none",
  },
  {
    path: "/tennis",
    element: <SportDashboardPage sport="Tennis" />,
    label: "Tennis",
    icon: <Dribbble size={16} />,
    sidebarContext: "none",
  },
  {
    path: "/padel",
    element: <SportDashboardPage sport="Padel" />,
    label: "Padel",
    icon: <Dribbble size={16} />,
    sidebarContext: "none",
  },
];
