import { Dribbble, Shield, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "@/shared/utils/cn";

type HubCardItem = {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
  layoutClassName?: string;
};

const topRowItems: HubCardItem[] = [
  {
    title: "Ligas",
    description: "Gestionar las ligas del deporte",
    icon: <Trophy size={16} />,
    to: "/leagues",
  },
  {
    title: "Jugadores",
    description: "Gestionar los jugadores del deporte",
    icon: <UsersRound size={16} />,
    to: "/players",
  },
  {
    title: "Equipos",
    description: "Gestionar los equipos del deporte",
    icon: <Shield size={16} />,
    to: "/teams",
  },
];

const bottomRowItems: HubCardItem[] = [
  {
    title: "Partido rapido",
    description: "Iniciar un partido amistoso",
    icon: <Dribbble size={16} />,
    to: "/quick-match",
    layoutClassName: "lg:col-span-2 lg:col-start-2",
  },
  {
    title: "Partidos competitivos",
    description: "Gestionar los partidos de ligas",
    icon: <Trophy size={16} />,
    to: "/leagues",
    layoutClassName: "lg:col-span-2 lg:col-start-4",
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
        item.layoutClassName
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
  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1260px]">
        <div className="mb-5">
          <h2 className="text-[40px] font-semibold tracking-tight text-slate-900 sm:text-[44px]">
            Basquet
          </h2>
        </div>

        <section className="rounded-[30px] border border-slate-300 bg-[linear-gradient(180deg,#fcfcfd_0%,#f6f7f9_100%)] p-2 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-8 sm:py-10 lg:min-h-[470px] lg:px-10 lg:py-12">
            <div className="grid gap-4 lg:grid-cols-3">
              {topRowItems.map((item) => (
                <HubCard key={item.title} item={item} />
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:mt-28 lg:grid-cols-6">
              {bottomRowItems.map((item) => (
                <HubCard key={item.title} item={item} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
