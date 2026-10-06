import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader, Panel } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type SportCard = {
  name: string;
  subtitle: string;
  colorClass: string;
  accentClass: string;
  to: string;
};

const sports: SportCard[] = [
  {
    name: "Basquetbol",
    subtitle: "Ligas, equipos, jugadores y partidos rapidos",
    colorClass: "from-orange-500 via-orange-600 to-slate-950",
    accentClass: "bg-orange-400",
    to: "/basketball",
  },
  {
    name: "Futbol",
    subtitle: "Organiza clubes, plantillas y competencias",
    colorClass: "from-emerald-500 via-emerald-700 to-slate-950",
    accentClass: "bg-emerald-400",
    to: "/football",
  },
  {
    name: "Tennis",
    subtitle: "Gestiona jugadores, encuentros y torneos",
    colorClass: "from-sky-400 via-sky-600 to-slate-950",
    accentClass: "bg-sky-300",
    to: "/tennis",
  },
  {
    name: "Padel",
    subtitle: "Administra parejas, partidos y clasificaciones",
    colorClass: "from-cyan-400 via-teal-600 to-slate-950",
    accentClass: "bg-cyan-300",
    to: "/padel",
  },
];

function SportItem({ sport, index }: { sport: SportCard; index: number }) {
  return (
    <Link to={sport.to} className="group block h-full no-underline">
      <article className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_45px_rgba(15,23,42,0.14)]">
        <div
          className={cn(
            "relative flex min-h-[190px] flex-1 overflow-hidden rounded-[19px] bg-gradient-to-br p-5",
            sport.colorClass,
          )}
        >
          <div className="absolute -right-12 -top-12 h-36 w-36 rounded-full border border-white/20" />
          <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-white/10 blur-sm" />
          <span className="relative text-xs font-bold tracking-[0.2em] text-white/60">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span
            className={cn(
              "absolute bottom-5 right-5 h-3 w-3 rounded-full shadow-[0_0_22px_currentColor]",
              sport.accentClass,
            )}
          />
        </div>

        <div className="flex items-end justify-between gap-4 px-2 pb-2 pt-5">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-950">{sport.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{sport.subtitle}</p>
          </div>
          <span className="mb-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-600">
            <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

export default function SportsPage() {
  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Elige un deporte" subtitle="Selecciona el espacio deportivo que quieres administrar." />

        <Panel className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {sports.map((sport, index) => (
              <SportItem key={sport.name} sport={sport} index={index} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
