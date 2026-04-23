import { CircleUserRound, Mail, MapPin, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getPlayerStatus, type Player } from "@/features/players/types/player";
import { Button, Input, Modal, Select } from "@/shared/components/ui";

type TeamOption = {
  id: number;
  name: string;
};

export type PlayerFormValues = Omit<Player, "id">;

type PlayerFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialPlayer?: Player | null;
  teams: TeamOption[];
  defaultTeamId: number | null;
  onClose: () => void;
  onSubmit: (values: PlayerFormValues) => void;
};

const emptyValues: PlayerFormValues = {
  name: "",
  email: "",
  phone: "",
  teamId: null,
  position: "",
};

export function PlayerFormModal({
  isOpen,
  mode,
  initialPlayer,
  teams,
  defaultTeamId,
  onClose,
  onSubmit,
}: PlayerFormModalProps) {
  const [values, setValues] = useState<PlayerFormValues>(emptyValues);

  useEffect(() => {
    if (!isOpen) return;
    if (initialPlayer) {
      const { name, email, phone, teamId, position } = initialPlayer;
      setValues({ name, email, phone, teamId, position });
      return;
    }
    if (defaultTeamId !== null) {
      setValues({ ...emptyValues, teamId: defaultTeamId });
      return;
    }
    setValues(emptyValues);
  }, [defaultTeamId, initialPlayer, isOpen]);

  const canSubmit = useMemo(() => {
    return Boolean(values.name.trim() && values.email.trim() && values.phone.trim() && values.position.trim());
  }, [values.email, values.name, values.phone, values.position]);

  const setField = <T extends keyof PlayerFormValues>(key: T, value: PlayerFormValues[T]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const status = getPlayerStatus(values);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Crear jugador" : "Editar jugador"}
      maxWidthClassName="max-w-2xl"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Nombre"
          value={values.name}
          onChange={(event) => setField("name", event.target.value)}
          leftIcon={<CircleUserRound size={14} />}
          placeholder="Ivan Perez"
        />
        <Input
          label="Telefono"
          value={values.phone}
          onChange={(event) => setField("phone", event.target.value)}
          leftIcon={<Phone size={14} />}
          placeholder="7717777344"
        />
        <Input
          label="Correo"
          type="email"
          value={values.email}
          onChange={(event) => setField("email", event.target.value)}
          leftIcon={<Mail size={14} />}
          placeholder="ivan@email.com"
        />
        <Input
          label="Posicion"
          value={values.position}
          onChange={(event) => setField("position", event.target.value)}
          leftIcon={<MapPin size={14} />}
          placeholder="Base"
        />
        <Select
          label="Equipo"
          value={values.teamId !== null ? String(values.teamId) : "none"}
          onChange={(event) => {
            const teamId = event.target.value === "none" ? null : Number(event.target.value);
            setField("teamId", teamId);
          }}
        >
          <option value="none">Sin equipo</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </Select>
        <Input label="Estatus" value={status} disabled />
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="secondary" disabled={!canSubmit} onClick={() => onSubmit(values)}>
          Guardar
        </Button>
      </div>
    </Modal>
  );
}
