import { CirclePlus } from "lucide-react";

import type { TeamRosterFilter } from "@/pages/teams/Teams.types";
import { Button, SearchInput, Select } from "@/shared/components/ui";

type TeamsToolbarProps = {
  search: string;
  rosterFilter: TeamRosterFilter;
  onSearchChange: (value: string) => void;
  onRosterFilterChange: (value: TeamRosterFilter) => void;
  onCreate: () => void;
};

export function TeamsToolbar({
  search,
  rosterFilter,
  onSearchChange,
  onRosterFilterChange,
  onCreate,
}: TeamsToolbarProps) {
  return (
    <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(280px,1.8fr)_minmax(180px,0.8fr)_auto] sm:items-center">
      <div className="w-full min-w-0">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Buscar equipo o jugador" />
      </div>

      <Select value={rosterFilter} onChange={(event) => onRosterFilterChange(event.target.value as TeamRosterFilter)}>
        <option value="all">Plantilla: Todos</option>
        <option value="with_players">Con jugadores</option>
        <option value="without_players">Sin jugadores</option>
      </Select>

      <div className="sm:justify-self-end">
        <Button variant="primary" size="sm" leftIcon={<CirclePlus size={14} />} onClick={onCreate}>
          Crear equipo
        </Button>
      </div>
    </div>
  );
}
