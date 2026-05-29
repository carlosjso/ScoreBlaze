import { CalendarDays, Shield, Trophy, UsersRound, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/shared/utils/cn";

export function FootballHubPage() {
  return (
    <div className="sb-page min-h-screen bg-[#fafafa] selection:bg-orange-100 selection:text-orange-900">
      <div className="sb-page-shell max-w-[1200px] px-4 py-10 sm:px-6 lg:px-8">
        
        {/* Encabezado Minimalista Ultra-Premium */}
        <div className="relative mb-12 flex items-center justify-between border-b border-slate-200/60 pb-6">
          <div>
            <span className="text-[11px] font-black tracking-widest text-orange-500 uppercase">
              Workspace
            </span>
            <h2 className="mt-1 text-[40px] font-black tracking-tighter text-slate-900 uppercase sm:text-[44px]">
              Fútbol
            </h2>
          </div>
          <div className="flex h-3 w-3 items-center justify-center rounded-full bg-orange-500/10">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
          </div>
        </div>

        {/* COMPOSICIÓN BENTO GRID RADICAL */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-6">
          
          {/* 1. MEGA TARJETA: LIGAS (Ocupa 3 columnas de ancho y es alta) */}
          <Link
            to="/football/leagues"
            className={cn(
              "group relative flex flex-col justify-between min-h-[260px] md:col-span-3 rounded-[32px] border border-slate-200/70 bg-white p-8 no-underline transition-all duration-500 ease-out",
              "shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:-translate-y-2 hover:border-orange-500/30 hover:shadow-[0_32px_64px_rgba(249,115,22,0.08)]"
            )}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-700 border border-slate-100 transition-all duration-500 group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:scale-110 group-hover:rotate-6">
                <Trophy size={26} />
              </span>
              <span className="text-slate-300 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-orange-500">
                <ArrowUpRight size={20} />
              </span>
            </div>
            
            <div className="relative z-10">
              <span className="block text-[13px] font-bold uppercase tracking-widest text-slate-400 mb-1">01 / Torneos</span>
              <span className="block text-[28px] font-black tracking-tight text-slate-900 transition-colors duration-300 group-hover:text-orange-600">
                Ligas
              </span>
            </div>
            {/* Elemento abstracto de fondo */}
            <div className="absolute right-0 bottom-0 h-32 w-32 bg-gradient-to-br from-orange-500/5 to-transparent rounded-tl-[100px] transition-all duration-500 group-hover:scale-125" />
          </Link>

          {/* 2. MEGA TARJETA INVERTIDA: JUGADORES (Ocupa 3 columnas, diseño enfocado en tipografía) */}
          <Link
            to="/football/players"
            className={cn(
              "group relative flex flex-col justify-between min-h-[260px] md:col-span-3 rounded-[32px] border border-slate-200/70 bg-gradient-to-b from-slate-900 to-slate-800 p-8 no-underline transition-all duration-500 ease-out",
              "shadow-[0_20px_40px_rgba(15,23,42,0.04)] hover:-translate-y-2 hover:border-orange-500/40 hover:shadow-[0_32px_64px_rgba(249,115,22,0.12)]"
            )}
          >
            <div className="flex items-start justify-between">
              <span className="text-slate-500 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-orange-400">
                <ArrowUpRight size={20} />
              </span>
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-slate-300 border border-white/10 transition-all duration-500 group-hover:bg-orange-500 group-hover:text-white group-hover:scale-110 group-hover:-translate-y-0.5">
                <UsersRound size={26} />
              </span>
            </div>

            <div>
              <span className="block text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-1">02 / Plantillas</span>
              <span className="block text-[28px] font-black tracking-tight text-white transition-colors duration-300 group-hover:text-orange-400">
                Jugadores
              </span>
            </div>
          </Link>

          {/* 3. TARJETA COMPACTA: EQUIPOS (Ocupa 2 columnas de ancho en pantallas grandes) */}
          <Link
            to="/football/teams"
            className={cn(
              "group flex flex-col justify-between min-h-[200px] lg:col-span-2 rounded-[32px] border border-slate-200/70 bg-white p-6 no-underline transition-all duration-500 ease-out",
              "shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:-translate-y-2 hover:border-orange-500/30 hover:shadow-[0_24px_48px_rgba(249,115,22,0.06)]"
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100 transition-all duration-500 group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:rotate-12">
              <Shield size={22} />
            </span>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">03 / Clubes</span>
              <span className="block text-[22px] font-black tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-orange-600">
                Equipos
              </span>
            </div>
          </Link>

          {/* 4. TARJETA RECTANGULAR LARGA: PARTIDO RÁPIDO (Ocupa 2 columnas) */}
          <Link
            to="/football/quick-match"
            className={cn(
              "group flex flex-col justify-between min-h-[200px] lg:col-span-2 rounded-[32px] border border-slate-200/70 bg-white p-6 no-underline transition-all duration-500 ease-out",
              "shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:-translate-y-2 hover:border-orange-500/30 hover:shadow-[0_24px_48px_rgba(249,115,22,0.06)]"
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100 transition-all duration-500 group-hover:bg-orange-50 group-hover:text-orange-600">
              <CalendarDays size={22} />
            </span>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">04 / Instantáneo</span>
              <span className="block text-[22px] font-black tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-orange-600">
                Partido rápido
              </span>
            </div>
          </Link>

          {/* 5. TARJETA RECTANGULAR LARGA: COMPETITIVOS (Ocupa 2 columnas) */}
          <Link
            to="/football/leagues"
            className={cn(
              "group flex flex-col justify-between min-h-[200px] lg:col-span-2 rounded-[32px] border border-slate-200/70 bg-white p-6 no-underline transition-all duration-500 ease-out",
              "shadow-[0_8px_30px_rgba(0,0,0,0.015)] hover:-translate-y-2 hover:border-orange-500/30 hover:shadow-[0_24px_48px_rgba(249,115,22,0.06)]"
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-100 transition-all duration-500 group-hover:bg-orange-50 group-hover:text-orange-600 group-hover:rotate-6">
              <Trophy size={22} />
            </span>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">05 / Clasificaciones</span>
              <span className="block text-[22px] font-black tracking-tight text-slate-900 transition-colors duration-200 group-hover:text-orange-600">
                Competitivos
              </span>
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}