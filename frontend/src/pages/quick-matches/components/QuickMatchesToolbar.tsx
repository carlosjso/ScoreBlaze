import { CirclePlus } from "lucide-react";

import type { MatchStatusFilter } from "@/pages/quick-matches/QuickMatches.types";
import { Button, SearchInput, Select } from "@/shared/components/ui";

type QuickMatchesToolbarProps = {
  search: string;
  statusFilter: MatchStatusFilter;
  disabled?: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: MatchStatusFilter) => void;
  onCreate: () => void;
};

export function QuickMatchesToolbar({
  search,
  statusFilter,
  disabled = false,
  onSearchChange,
  onStatusFilterChange,
  onCreate,
}: QuickMatchesToolbarProps) {
  return (
    <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(280px,1.7fr)_minmax(200px,0.8fr)_auto] sm:items-center">
      <div className="w-full min-w-0">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por equipo, estatus o fecha"
        />
      </div>

      <Select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as MatchStatusFilter)}>
        <option value="all">Estatus: Todos</option>
        <option value="scheduled">Programado</option>
        <option value="live">En juego</option>
        <option value="finished">Finalizado</option>
      </Select>

      <Button
        variant="primary"
        size="lg"
        leftIcon={<CirclePlus size={18} />}
        expandOnHover
        onClick={onCreate}
        disabled={disabled}
        className="shadow-[0_8px_18px_rgba(249,115,22,0.28)]"
      >
        Crear partido
      </Button>
    </div>
  );
}
