import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader, Panel } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type SportCard = {
  name: string;
  subtitle: string;
  colorClass: string;
  to: string;
};

const sports: SportCard[] = [
  {
    name: "Basquetbol",
    subtitle: "Gestion de ligas, equipos, jugadores y partidos rapidos",
    colorClass: "from-orange-500 to-slate-900",
    to: "/basketball",
  },
  {
    name: "Futbol",
    subtitle: "Dashboard deportivo por modulo",
    colorClass: "from-emerald-500 to-slate-900",
    to: "/football",
  },
  {
    name: "Tennis",
    subtitle: "Dashboard deportivo por modulo",
    colorClass: "from-sky-500 to-slate-900",
    to: "/tennis",
  },
  {
    name: "Padel",
    subtitle: "Dashboard deportivo por modulo",
    colorClass: "from-cyan-500 to-slate-900",
    to: "/padel",
  },
];

function SportItem({ sport }: { sport: SportCard }) {
  return (
    <Link to={sport.to} className="no-underline">
      <article className="group rounded-2xl border border-slate-300/90 bg-white p-3 shadow-sm transition hover:-translate-y-0.5">
        <div className={cn("h-40 rounded-xl bg-gradient-to-b", sport.colorClass)} />
        <div className="mt-3 flex items-center justify-between gap-2 px-1">
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-slate-800">{sport.name}</h3>
            <p className="line-clamp-2 text-xs text-slate-500">{sport.subtitle}</p>
          </div>
          <ArrowRight size={17} className="shrink-0 text-slate-500 transition group-hover:translate-x-1" />
        </div>
      </article>
    </Link>
  );
}

export default function SportsPage() {
  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Inicio" subtitle="Selecciona un deporte para entrar a su dashboard." />

        <Panel className="p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sports.map((sport) => (
              <SportItem key={sport.name} sport={sport} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
