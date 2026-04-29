import { Dribbble, House, Shield, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

export type SidebarContext = "home" | "basketball" | "none";

export type SidebarRouteItem = {
  path: string;
  label: string;
  icon: ReactNode;
  sidebarContext: SidebarContext;
};

export const sidebarRoutes: SidebarRouteItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: <House size={16} />,
    sidebarContext: "home",
  },
  {
    path: "/basketball",
    label: "Basquet",
    icon: <Dribbble size={16} />,
    sidebarContext: "none",
  },
  {
    path: "/players",
    label: "Jugadores",
    icon: <UsersRound size={16} />,
    sidebarContext: "basketball",
  },
  {
    path: "/teams",
    label: "Equipos",
    icon: <Shield size={16} />,
    sidebarContext: "basketball",
  },
  {
    path: "/quick-match",
    label: "Partido rapido",
    icon: <Dribbble size={16} />,
    sidebarContext: "basketball",
  },
  {
    path: "/leagues",
    label: "Ligas",
    icon: <Trophy size={16} />,
    sidebarContext: "basketball",
  },
  {
    path: "/football",
    label: "Futbol",
    icon: <Dribbble size={16} />,
    sidebarContext: "none",
  },
  {
    path: "/tennis",
    label: "Tennis",
    icon: <Dribbble size={16} />,
    sidebarContext: "none",
  },
  {
    path: "/padel",
    label: "Padel",
    icon: <Dribbble size={16} />,
    sidebarContext: "none",
  },
];
