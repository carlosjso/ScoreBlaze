import { Menu } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

import Sidebar from "@/app/layouts/Sidebar";
import { sidebarRoutes } from "@/app/navigation/sidebarRoutes";
import { IconButton } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

function isBasketballPath(pathname: string) {
  return (
    pathname === "/basketball" ||
    pathname === "/teams" ||
    pathname.startsWith("/teams/") ||
    pathname === "/players" ||
    pathname.startsWith("/players/") ||
    pathname === "/quick-match" ||
    pathname.startsWith("/quick-match/") ||
    pathname === "/leagues" ||
    pathname === "/scoreboard" ||
    pathname.startsWith("/scoreboard/")
  );
}

const breadcrumbByPath: Record<string, BreadcrumbItem[]> = {
  "/dashboard": [{ label: "Inicio" }],
  "/basketball": [{ label: "Inicio", to: "/dashboard" }, { label: "Basquet" }],
  "/teams": [{ label: "Inicio", to: "/dashboard" }, { label: "Basquet", to: "/basketball" }, { label: "Equipos" }],
  "/players": [
    { label: "Inicio", to: "/dashboard" },
    { label: "Basquet", to: "/basketball" },
    { label: "Jugadores" },
  ],
  "/quick-match": [
    { label: "Inicio", to: "/dashboard" },
    { label: "Basquet", to: "/basketball" },
    { label: "Partido rapido" },
  ],
  "/leagues": [{ label: "Inicio", to: "/dashboard" }, { label: "Basquet", to: "/basketball" }, { label: "Ligas" }],
  "/football": [{ label: "Inicio", to: "/dashboard" }, { label: "Futbol" }],
  "/tennis": [{ label: "Inicio", to: "/dashboard" }, { label: "Tennis" }],
  "/padel": [{ label: "Inicio", to: "/dashboard" }, { label: "Padel" }],
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();

  const menuRoutes = useMemo(
    () =>
      sidebarRoutes.filter((route) => {
        if (isBasketballPath(location.pathname)) return route.sidebarContext === "basketball";
        return route.sidebarContext === "home";
      }),
    [location.pathname]
  );

  const breadcrumbs =
    location.pathname.startsWith("/players/") && location.pathname.endsWith("/teams")
      ? [
          { label: "Inicio", to: "/dashboard" },
          { label: "Basquet", to: "/basketball" },
          { label: "Jugadores", to: "/players" },
          { label: "Asignar equipo" },
        ]
      : location.pathname.startsWith("/teams/") && location.pathname.endsWith("/roster/manage")
      ? [
          { label: "Inicio", to: "/dashboard" },
          { label: "Basquet", to: "/basketball" },
          { label: "Equipos", to: "/teams" },
          { label: "Plantilla", to: location.pathname.replace(/\/manage$/, "") },
          { label: "Asignar jugadores" },
        ]
      : location.pathname.startsWith("/teams/") && location.pathname.endsWith("/roster")
      ? [
          { label: "Inicio", to: "/dashboard" },
          { label: "Basquet", to: "/basketball" },
          { label: "Equipos", to: "/teams" },
          { label: "Plantilla" },
        ]
      : location.pathname.startsWith("/quick-match/") && location.pathname.endsWith("/stats")
      ? [
          { label: "Inicio", to: "/dashboard" },
          { label: "Basquet", to: "/basketball" },
          { label: "Partido rapido", to: "/quick-match" },
          { label: "Consultar estadisticas" },
        ]
      : breadcrumbByPath[location.pathname] ?? [{ label: "Inicio", to: "/dashboard" }];
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label ?? "ScoreBlaze";

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar
        routes={menuRoutes}
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <div className={cn("min-h-screen transition-[padding] duration-200", sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-[248px]")}>
        <main className="min-h-screen p-3 sm:p-4">
          <nav aria-label="Breadcrumb" className="mb-2 hidden sm:block">
            <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {breadcrumbs.map((crumb, index) => (
                <li key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1.5">
                  {crumb.to && index < breadcrumbs.length - 1 ? (
                    <Link to={crumb.to} className="font-medium text-slate-500 no-underline transition hover:text-slate-700">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={index === breadcrumbs.length - 1 ? "font-semibold text-slate-800" : undefined}>
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 ? <span className="text-slate-400">›</span> : null}
                </li>
              ))}
            </ol>
          </nav>

          <div className="mb-2 flex items-center gap-2 lg:hidden">
            <IconButton
              label="Abrir menu"
              onClick={() => setSidebarOpen(true)}
              variant="ghost"
              className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            >
              <Menu size={18} />
            </IconButton>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{pageTitle}</p>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}
