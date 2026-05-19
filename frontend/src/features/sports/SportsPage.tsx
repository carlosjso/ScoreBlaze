import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type SportCard = {
  id: string;
  name: string;
  subtitle: string;
  baseColorClass: string;
  hoverColorClass: string;
  beamColor: string; 
  to: string;
};

const sports: SportCard[] = [
  {
    id: "01",
    name: "Basquetbol",
    subtitle: "Gestión de ligas, equipos, jugadores y partidos rápidos",
    baseColorClass: "text-orange-600/40 bg-orange-100/50",
    hoverColorClass: "text-orange-400 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600 bg-[length:200%_auto]",
    beamColor: "#f97316",
    to: "/basketball",
  },
  {
    id: "02",
    name: "Futbol",
    subtitle: "Dashboard deportivo por módulo",
    baseColorClass: "text-emerald-600/40 bg-emerald-100/50",
    hoverColorClass: "text-emerald-400 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 bg-[length:200%_auto]",
    beamColor: "#10b981",
    to: "/football",
  },
  {
    id: "03",
    name: "Tennis",
    subtitle: "Dashboard deportivo por módulo",
    baseColorClass: "text-sky-600/40 bg-sky-100/50",
    hoverColorClass: "text-sky-400 bg-gradient-to-r from-sky-600 via-sky-400 to-sky-600 bg-[length:200%_auto]",
    beamColor: "#0ea5e9",
    to: "/tennis",
  },
  {
    id: "04",
    name: "Padel",
    subtitle: "Dashboard deportivo por módulo",
    baseColorClass: "text-cyan-600/40 bg-cyan-100/50",
    hoverColorClass: "text-cyan-400 bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-600 bg-[length:200%_auto]",
    beamColor: "#06b6d4",
    to: "/padel",
  },
];

function SportItem({ sport }: { sport: SportCard }) {
  const particles = Array.from({ length: 15 });

  return (
    <Link to={sport.to} className="no-underline">
      <article 
        className="group relative flex h-[420px] flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-[#f9f9f7] p-2 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl"
        style={{ '--beam-color': sport.beamColor } as React.CSSProperties}
      >
        {/* Rayo de luz perimetral */}
        <div className="sb-border-beam group-hover:opacity-100" />

        {/* CONTENEDOR SUPERIOR ANIMADO */}
        <div className="relative h-60 w-full overflow-hidden rounded-[20px] bg-[#f1f1ee] flex items-center justify-center transition-all duration-500">
          
          {/* Fondo Base */}
          <div className={cn("absolute inset-0 transition-opacity duration-500 group-hover:opacity-0", sport.baseColorClass)} />

          {/* Gradiente Animado (Shimmer) */}
          <div className={cn(
            "absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 animate-[shimmer_3s_linear_infinite]", 
            sport.hoverColorClass
          )} />

          {/* Partículas (Cuadritos) */}
          <div className={cn("particle-grid relative z-10 transition-colors duration-500", "group-hover:text-white text-current")}>
            {particles.map((_, i) => (
              <div 
                key={i} 
                className="particle-square" 
                style={{ 
                  animationDelay: `${(i * 0.12).toFixed(2)}s`,
                  filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.3))' 
                }}
              />
            ))}
          </div>

          <span className="absolute left-4 top-4 text-xs font-bold text-slate-400 group-hover:text-white/50 transition-colors">
            {sport.id}
          </span>
        </div>

        {/* TEXTO INFERIOR */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div className="text-left">
            <h3 className="text-xl font-bold text-slate-800 transition-colors group-hover:text-slate-900">
              {sport.name}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400 line-clamp-3">
              {sport.subtitle}
            </p>
          </div>

          <div className="flex items-center justify-between mt-4">
             <span className="text-xs font-medium text-slate-400 group-hover:text-slate-600 transition-colors">
               Explorar módulo
             </span>
             <ArrowRight size={20} className="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-slate-900" />
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function SportsPage() {
  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <div className="mb-12">
          <PageHeader 
            title="Inicio" 
            subtitle="Gestiona tus deportes con una interfaz moderna y dinámica." 
          />
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {sports.map((sport) => (
            <SportItem key={sport.name} sport={sport} />
          ))}
        </div>
      </div>
    </div>
  );
}