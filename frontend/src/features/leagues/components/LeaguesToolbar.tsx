import { CirclePlus } from "lucide-react";

import type { CompetitionType } from "@/features/leagues/Leagues.types";
import { Button, SearchInput } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type LeaguesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  createLabel?: string;
  competitionType: CompetitionType;
  onCompetitionTypeChange: (competitionType: CompetitionType) => void;
};

const competitionTypeLabels: Record<CompetitionType, string> = {
  LEAGUE: "Fase regular",
  ELIMINATION: "Eliminatoria",
};

export function LeaguesToolbar({
  search,
  onSearchChange,
  onCreate,
  createLabel = "Crear liga",
  competitionType,
  onCompetitionTypeChange,
}: LeaguesToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2">
        <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Tipo de competencia</span>
        {(["LEAGUE", "ELIMINATION"] as const).map((typeOption) => (
          <button
            key={typeOption}
            type="button"
            onClick={() => onCompetitionTypeChange(typeOption)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              competitionType === typeOption
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700",
            )}
          >
            {competitionTypeLabels[typeOption]}
          </button>
        ))}
      </div>

      <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(320px,1.8fr)_auto] sm:items-center">
        <div className="w-full min-w-0">
          <SearchInput value={search} onChange={onSearchChange} placeholder="Buscar por nombre, categoria, responsable o equipo" />
        </div>

        <Button
          variant="primary"
          size="lg"
          leftIcon={<CirclePlus size={18} />}
          expandOnHover
          onClick={onCreate}
          className="shadow-[0_8px_18px_rgba(249,115,22,0.28)]"
        >
          {createLabel}
        </Button>
      </div>
    </div>
  );
}
