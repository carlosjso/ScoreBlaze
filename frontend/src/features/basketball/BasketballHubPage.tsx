import { Dribbble, Shield, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { hasAllPermissions } from "@/features/auth/permissions";
import { cn } from "@/shared/utils/cn";

type HubCardItem = {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
  permissions: readonly string[];
};

const hubItems: HubCardItem[] = [
  {
    title: "Jugadores",
    description: "Gestionar los jugadores del deporte",
    icon: <UsersRound size={16} />,
    to: "/players",
    permissions: ["players.view"],
  },
  {
    title: "Equipos",
    description: "Gestionar los equipos del deporte",
    icon: <Shield size={16} />,
    to: "/teams",
    permissions: ["teams.view"],
  },
  {
    title: "Partido rapido",
    description: "Iniciar un partido amistoso",
    icon: <Dribbble size={16} />,
    to: "/quick-match",
    permissions: ["quick_match.view"],
  },
  {
    title: "Ligas",
    description: "Gestionar ligas, eliminatorias, calendario y partidos",
    icon: <Trophy size={16} />,
    to: "/leagues",
    permissions: ["leagues.view"],
  },
];

function HubCard({ item }: { item: HubCardItem }) {
  return (
    <Link
      to={item.to}
      className={cn(
        "group flex min-h-[84px] items-center gap-4 rounded-[18px] border border-slate-300 bg-white px-4 py-4 text-slate-800 no-underline shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition duration-200",
        "hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_14px_28px_rgba(249,115,22,0.14)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2",
      )}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-600">
        {item.icon}
      </span>

      <span className="min-w-0">
        <span className="block text-lg font-semibold leading-none tracking-tight text-slate-900 sm:text-[19px]">
          {item.title}
        </span>
        <span className="mt-2 block text-[11px] leading-4 text-slate-500">
          {item.description}
        </span>
      </span>
    </Link>
  );
}

export default function BasketballHubPage() {
  const { session } = useAuth();
  const visibleHubItems = hubItems.filter((item) => hasAllPermissions(session, item.permissions));

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1260px]">
        <div className="mb-5">
          <h2 className="text-[40px] font-semibold tracking-tight text-slate-900 sm:text-[44px]">
            Basquet
          </h2>
        </div>

        <section className="rounded-[30px] border border-slate-300 bg-[linear-gradient(180deg,#fcfcfd_0%,#f6f7f9_100%)] p-2 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-8 sm:py-10 lg:min-h-[420px] lg:px-12 lg:py-12">
            {visibleHubItems.length > 0 ? (
              <div className="mx-auto grid max-w-[980px] gap-4 md:grid-cols-2">
                {visibleHubItems.map((item) => (
                  <HubCard key={item.title} item={item} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
                <p className="text-sm font-semibold">No tienes modulos de basquet asignados.</p>
                <p className="mt-1 text-sm text-amber-700">Pide a un administrador que agregue permisos a tu rol.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
