import { Dribbble, Shield, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { PageHeader, Panel } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type HubItem = {
  title: string;
  description: string;
  icon: ReactNode;
  to: string;
  highlighted?: boolean;
};

const items: HubItem[] = [
  {
    title: "Jugadores",
    description: "Gestionar jugadores del deporte",
    icon: <UsersRound size={15} />,
    to: "/team-players",
  },
  {
    title: "Equipos",
    description: "Gestionar equipos y responsables",
    icon: <Shield size={15} />,
    to: "/teams",
    highlighted: true,
  },
  {
    title: "Partido rapido",
    description: "Registrar partidos amistosos uno a uno",
    icon: <Dribbble size={15} />,
    to: "/quick-match",
  },
  {
    title: "Ligas",
    description: "Configurar ligas y asignar equipos",
    icon: <Trophy size={15} />,
    to: "/leagues",
  },
];

function HubCard({ item }: { item: HubItem }) {
  return (
    <Link
      to={item.to}
      className={cn(
        "flex w-full items-start gap-2 rounded-2xl border bg-white px-4 py-3 no-underline shadow-sm transition hover:-translate-y-0.5",
        item.highlighted ? "border-orange-300 text-slate-800" : "border-slate-300 text-slate-700"
      )}
    >
      <span className="mt-1 text-slate-600">{item.icon}</span>
      <span className="min-w-0">
        <span className="block text-base font-semibold leading-tight">{item.title}</span>
        <span className="mt-1 block truncate text-xs text-slate-500">{item.description}</span>
      </span>
    </Link>
  );
}

export default function BasketballHubPage() {
  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Basquet"
          subtitle="Gestiona jugadores, equipos, partidos rapidos y ligas desde un solo dashboard."
        />

        <Panel className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((item) => (
              <HubCard key={item.title} item={item} />
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
