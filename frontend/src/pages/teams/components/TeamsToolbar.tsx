import { ChevronDown, CirclePlus } from "lucide-react";

import type { SortDir, SortKey } from "@/pages/teams/Teams.types";
import { Button, Select } from "@/shared/components/ui";

type TeamsToolbarProps = {
  sortKey: SortKey;
  sortDir: SortDir;
  onSortKeyChange: (value: SortKey) => void;
  onToggleSortDir: () => void;
  onCreate: () => void;
};

export function TeamsToolbar({
  sortKey,
  sortDir,
  onSortKeyChange,
  onToggleSortDir,
  onCreate,
}: TeamsToolbarProps) {
  return (
    <div className="mb-5 grid gap-3 lg:grid-cols-[180px_minmax(240px,1fr)_auto] lg:items-center">
      <div className="rounded-full border border-slate-400 bg-white px-2 py-1 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
        <div className="relative">
          <Select
            value="basketball"
            disabled
            className="h-10 rounded-full border-transparent bg-transparent px-4 py-2 pr-10 text-base font-semibold text-slate-900 shadow-none focus:border-transparent focus:ring-0"
            containerClassName="space-y-0"
          >
            <option value="basketball">Basquet</option>
          </Select>

          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
            <ChevronDown size={16} />
          </span>
        </div>
      </div>

      <div className="rounded-full border border-slate-400 bg-white px-2 py-1 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-[minmax(0,1fr)_36px] items-center gap-2">
          <Select
            value={sortKey}
            onChange={(event) => onSortKeyChange(event.target.value as SortKey)}
            className="h-10 rounded-full border-transparent bg-transparent px-4 py-2 pr-4 text-sm font-semibold text-slate-700 shadow-none focus:border-transparent focus:ring-0"
            containerClassName="space-y-0"
          >
            <option value="name">Nombre</option>
            <option value="id">ID</option>
            <option value="players">Plantilla</option>
          </Select>

          <button
            type="button"
            onClick={onToggleSortDir}
            title={sortDir === "asc" ? "Orden ascendente" : "Orden descendente"}
            aria-label={sortDir === "asc" ? "Orden ascendente" : "Orden descendente"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#163f7a] text-white transition hover:bg-[#0f2f5c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-1"
          >
            <ChevronDown size={15} className={sortDir === "asc" ? "rotate-180" : undefined} />
          </button>
        </div>
      </div>

      <div className="lg:justify-self-end">
        <Button
          variant="primary"
          size="lg"
          leftIcon={<CirclePlus size={18} />}
          expandOnHover
          onClick={onCreate}
          className="shadow-[0_8px_18px_rgba(249,115,22,0.28)]"
        >
          Crear
        </Button>
      </div>
    </div>
  );
}
