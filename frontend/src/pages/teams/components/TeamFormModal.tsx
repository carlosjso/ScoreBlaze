import { CircleUserRound, Mail, Phone } from "lucide-react";
import { useEffect, useState } from "react";

import type { Team } from "@/pages/teams/types/team";
import { Button, Input, Modal, Select } from "@/shared/components/ui";

type TeamFormValues = Omit<Team, "id" | "playersCount">;

type TeamFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialTeam?: Team | null;
  onClose: () => void;
  onSubmit: (values: TeamFormValues) => void;
};

const emptyValues: TeamFormValues = {
  name: "",
  responsibleName: "",
  responsibleEmail: "",
  responsiblePhone: "",
  status: "Activo",
};

export function TeamFormModal({ isOpen, mode, initialTeam, onClose, onSubmit }: TeamFormModalProps) {
  const [values, setValues] = useState<TeamFormValues>(emptyValues);

  useEffect(() => {
    if (!isOpen) return;
    if (initialTeam) {
      const { name, responsibleName, responsibleEmail, responsiblePhone, status } = initialTeam;
      setValues({ name, responsibleName, responsibleEmail, responsiblePhone, status });
      return;
    }
    setValues(emptyValues);
  }, [initialTeam, isOpen]);

  const canSubmit =
    values.name.trim() &&
    values.responsibleName.trim() &&
    values.responsibleEmail.trim() &&
    values.responsiblePhone.trim();

  const setField = (key: keyof TeamFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Crear equipo" : "Editar equipo"}
      maxWidthClassName="max-w-lg"
    >
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
        Logo
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Input
          label="Nombre del equipo"
          value={values.name}
          onChange={(event) => setField("name", event.target.value)}
          leftIcon={<CircleUserRound size={14} />}
          placeholder="Plateneros"
        />
        <Select
          label="Estatus"
          value={values.status}
          onChange={(event) => setField("status", event.target.value)}
        >
          <option value="Activo">Activo</option>
          <option value="Inactivo">Inactivo</option>
          <option value="Suspendido">Suspendido</option>
        </Select>
        <Input
          label="Nombre del responsable"
          value={values.responsibleName}
          onChange={(event) => setField("responsibleName", event.target.value)}
          leftIcon={<CircleUserRound size={14} />}
          placeholder="Alex Caruso"
        />
        <Input
          label="Telefono del responsable"
          value={values.responsiblePhone}
          onChange={(event) => setField("responsiblePhone", event.target.value)}
          leftIcon={<Phone size={14} />}
          placeholder="7717777344"
        />
        <Input
          label="Correo del responsable"
          type="email"
          value={values.responsibleEmail}
          onChange={(event) => setField("responsibleEmail", event.target.value)}
          leftIcon={<Mail size={14} />}
          placeholder="alex@email.com"
        />
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
