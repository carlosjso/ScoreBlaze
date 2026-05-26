import { ArrowRight, Dribbble, Shield, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { hasAllPermissions } from "@/features/auth/permissions";
import { PageHeader, Panel } from "@/shared/components/ui";

type DashboardCard = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  meta: string;
  to: string;
  permissions: readonly string[];
};

const dashboardItems: DashboardCard[] = [
  {
    title: "Jugadores",
    subtitle: "Consulta perfiles y asignaciones a equipos",
    icon: <UsersRound size={18} />,
    meta: "Roster",
    to: "/players",
    permissions: ["players.view"],
  },
  {
    title: "Equipos",
    subtitle: "Gestiona plantillas, datos y logos",
    icon: <Shield size={18} />,
    meta: "Clubes",
    to: "/teams",
    permissions: ["teams.view"],
  },
  {
    title: "Partidos rapidos",
    subtitle: "Agenda amistosos y abre captura de marcador",
    icon: <Dribbble size={18} />,
    meta: "Amistosos",
    to: "/quick-match",
    permissions: ["quick_match.view"],
  },
  {
    title: "Ligas",
    subtitle: "Ligas, eliminatorias, calendarios y standings",
    icon: <Trophy size={18} />,
    meta: "Temporada",
    to: "/leagues",
    permissions: ["leagues.view"],
  },
];

function DashboardItem({ item }: { item: DashboardCard }) {
  return (
    <Link to={item.to} className="no-underline">
      <article className="group relative flex h-full min-h-[154px] overflow-hidden rounded-[18px] border border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_18px_34px_rgba(15,23,42,0.09)]">
        <div className="flex w-full flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-600">
              {item.icon}
            </span>

            <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {item.meta}
              <ArrowRight size={15} className="shrink-0 transition group-hover:translate-x-1 group-hover:text-orange-500" />
            </span>
          </div>

          <div className="mt-6 min-w-0">
            <h3 className="truncate text-[22px] font-bold leading-tight text-slate-950">{item.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">{item.subtitle}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function SportsPage() {
  const { session } = useAuth();
  const visibleItems = dashboardItems.filter((item) => hasAllPermissions(session, item.permissions));

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Inicio" subtitle="Gestiona tu liga de basquet desde tus accesos principales." />

        <Panel className="p-4 sm:p-6">
          {visibleItems.length > 0 ? (
            <div className="mx-auto max-w-[1040px]">
              <div className="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-500">Basquetbol</p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950">Panel principal</h3>
                </div>
                <p className="text-sm font-medium text-slate-500">
                  {visibleItems.length} {visibleItems.length === 1 ? "modulo activo" : "modulos activos"}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleItems.map((item) => (
                  <DashboardItem key={item.title} item={item} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
              <p className="text-sm font-semibold">Tu rol no tiene modulos asignados.</p>
              <p className="mt-1 text-sm text-amber-700">Pide a un administrador que agregue permisos para empezar a trabajar.</p>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
