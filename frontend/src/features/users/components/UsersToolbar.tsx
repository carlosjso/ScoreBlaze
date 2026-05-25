import { CirclePlus } from "lucide-react";

import { Button, SearchInput } from "@/shared/components/ui";

type UsersToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onCreate: () => void;
  canCreate?: boolean;
};

export function UsersToolbar({ search, onSearchChange, onCreate, canCreate = true }: UsersToolbarProps) {
  return (
    <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(320px,1.8fr)_auto] sm:items-center">
      <div className="w-full min-w-0">
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o correo..."
        />
      </div>

      {canCreate ? (
        <Button
          variant="primary"
          size="lg"
          leftIcon={<CirclePlus size={18} />}
          expandOnHover
          onClick={onCreate}
          className="shadow-[0_8px_18px_rgba(249,115,22,0.28)]"
        >
          Crear usuario
        </Button>
      ) : null}
    </div>
  );
}
