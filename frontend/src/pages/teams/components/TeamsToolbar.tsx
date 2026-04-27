import { CirclePlus } from "lucide-react";

import type { SortKey } from "@/pages/teams/Teams.types";
import { Button, SearchInput, Select } from "@/shared/components/ui";

type TeamsToolbarProps = {
  sortKey: SortKey;
  onSortKeyChange: (value: SortKey) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
};

export function TeamsToolbar({
  sortKey,
  onSortKeyChange,
  search,
  onSearchChange,
  onCreate,
}: TeamsToolbarProps) {
  return (
    <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(220px,1fr)_minmax(280px,1.6fr)_auto] sm:items-center">
      <Select value={sortKey} onChange={(event) => onSortKeyChange(event.target.value as SortKey)}>
        <option value="name">Ordenar por: Nombre</option>
        <option value="id">Ordenar por: ID</option>
        <option value="players">Ordenar por: Plantilla</option>
      </Select>

      <div className="w-full min-w-0">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o jugadores..."
        />
      </div>

      <Button
        variant="primary"
        size="lg"
        leftIcon={<CirclePlus size={18} />}
        expandOnHover
        onClick={onCreate}
        className="shadow-[0_8px_18px_rgba(249,115,22,0.28)]"
      >
        Crear equipo
      </Button>
    </div>
  );
}
