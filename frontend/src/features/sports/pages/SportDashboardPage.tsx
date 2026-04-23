import { CalendarClock, Shield, Trophy, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader, Panel } from "@/shared/components/ui";

type SportDashboardPageProps = {
  sport: string;
};

type ModuleCard = {
  title: string;
  description: string;
  icon: ReactNode;
};

const cards: ModuleCard[] = [
  {
    title: "Jugadores",
    description: "Gestion de jugadores por equipos y estatus.",
    icon: <UsersRound size={16} />,
  },
  {
    title: "Equipos",
    description: "Administracion de plantillas, responsables y estado.",
    icon: <Shield size={16} />,
  },
  {
    title: "Partido rapido",
    description: "Programacion de un partido amistoso entre dos equipos.",
    icon: <CalendarClock size={16} />,
  },
  {
    title: "Ligas",
    description: "Alta de ligas, fechas y equipos participantes.",
    icon: <Trophy size={16} />,
  },
];

export default function SportDashboardPage({ sport }: SportDashboardPageProps) {
  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title={sport} subtitle={`Dashboard de ${sport}. Este modulo esta listo para crecer igual que Basquet.`} />

        <Panel className="p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {cards.map((card) => (
              <article key={card.title} className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                <div className="mb-2 inline-flex rounded-lg border border-slate-200 bg-slate-100 p-2 text-slate-600">
                  {card.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{card.description}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
