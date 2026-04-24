import { Mail, Phone, UserCircle2 } from "lucide-react";

import type { Team } from "@/pages/teams/types/team";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { Button, Input, Modal } from "@/shared/components/ui";

type TeamDetailModalProps = {
  team: Team | null;
  isOpen: boolean;
  onClose: () => void;
};

export function TeamDetailModal({ team, isOpen, onClose }: TeamDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ver equipo" maxWidthClassName="max-w-lg">
      {team ? (
        <div>
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 text-sm font-bold text-slate-600">
            {team.name.slice(0, 3).toUpperCase()}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Input label="Nombre" value={team.name} disabled leftIcon={<UserCircle2 size={14} />} />
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-600">Estatus</p>
              <StatusBadge status={team.status} />
            </div>
            <Input label="Responsable" value={team.responsibleName} disabled leftIcon={<UserCircle2 size={14} />} />
            <Input label="Telefono" value={team.responsiblePhone} disabled leftIcon={<Phone size={14} />} />
            <Input label="Correo" value={team.responsibleEmail} disabled leftIcon={<Mail size={14} />} />
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
