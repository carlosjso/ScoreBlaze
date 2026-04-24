import { CirclePlus } from "lucide-react";

import type { SortKey } from "@/pages/teams/Teams.types";
import { Button, Select } from "@/shared/components/ui";

type TeamsToolbarProps = {
  sortKey: SortKey;
  onSortKeyChange: (value: SortKey) => void;
  onCreate: () => void;
};

export function TeamsToolbar({
  sortKey,
  onSortKeyChange,
  onCreate,
}: TeamsToolbarProps) {
  return (
    <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(180px,0.9fr)_minmax(220px,0.8fr)_auto] sm:items-center">
      <div className="sb-input flex items-center rounded-full border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800">
        Basquet
      </div>

      <div className="w-full min-w-0">
        <Select
          value={sortKey}
          onChange={(event) => onSortKeyChange(event.target.value as SortKey)}
          className="w-full"
        >
          <option value="name">Ordenar por: Nombre</option>
          <option value="id">Ordenar por: ID</option>
          <option value="players">Ordenar por: Plantilla</option>
        </Select>
      </div>

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
  );
}
