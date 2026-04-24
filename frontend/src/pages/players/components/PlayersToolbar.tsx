import { CirclePlus } from "lucide-react";

import type { ApiTeam, TeamFilterValue } from "@/pages/players/Players.types";
import { Button, SearchInput, Select } from "@/shared/components/ui";

type PlayersToolbarProps = {
  teams: ApiTeam[];
  teamFilter: TeamFilterValue;
  search: string;
  onTeamFilterChange: (value: TeamFilterValue) => void;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
};

export function PlayersToolbar({
  teams,
  teamFilter,
  search,
  onTeamFilterChange,
  onSearchChange,
  onCreate,
}: PlayersToolbarProps) {
  return (
    <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(220px,1fr)_minmax(280px,1.6fr)_auto] sm:items-center">
      <Select value={teamFilter} onChange={(event) => onTeamFilterChange(event.target.value as TeamFilterValue)}>
        <option value="all">Equipo: Todos</option>
        <option value="none">Equipo: Sin equipo</option>
        {teams.map((team) => (
          <option key={team.id} value={String(team.id)}>
            {team.name}
          </option>
        ))}
      </Select>

      <div className="w-full min-w-0">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Buscar por nombre, correo, telefono o equipo" />
      </div>

      <Button variant="primary" size="sm" leftIcon={<CirclePlus size={14} />} onClick={onCreate}>
        Crear jugador
      </Button>
    </div>
  );
}
