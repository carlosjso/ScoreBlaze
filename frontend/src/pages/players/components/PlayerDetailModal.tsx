import { CircleUserRound, Hash, Mail, Phone } from "lucide-react";

import type { PlayerListItem } from "@/pages/players/Players.types";
import { Button, Input, Modal } from "@/shared/components/ui";

type PlayerDetailModalProps = {
  player: PlayerListItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function PlayerDetailModal({ player, isOpen, onClose }: PlayerDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Jugador" maxWidthClassName="max-w-lg">
      {player ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
            {player.name
              .split(" ")
              .map((chunk) => chunk[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Nombre" value={player.name} disabled leftIcon={<CircleUserRound size={14} />} />
            <Input label="Telefono" value={player.phone || "Sin telefono"} disabled leftIcon={<Phone size={14} />} />
            <Input label="Correo" value={player.email} disabled leftIcon={<Mail size={14} />} />
            <Input label="Estatus" value={player.status} disabled leftIcon={<Hash size={14} />} />

            <div className="sm:col-span-2">
              <p className="mb-1 text-xs font-semibold text-slate-600">Equipos</p>
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                {player.teamNames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {player.teamNames.map((teamName) => (
                      <span
                        key={`${player.id}-${teamName}`}
                        className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {teamName}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Sin equipo asignado.</p>
                )}
              </div>
            </div>
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
