import { CircleUserRound, Hash, Mail, Phone } from "lucide-react";

import { getPlayerStatus, type Player } from "@/features/players/types/player";
import { mockTeams } from "@/features/teams/data/mockTeams";
import { Button, Input, Modal } from "@/shared/components/ui";

type PlayerDetailModalProps = {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
};

export function PlayerDetailModal({ player, isOpen, onClose }: PlayerDetailModalProps) {
  const teamName = player?.teamId ? mockTeams.find((team) => team.id === player.teamId)?.name ?? `Equipo #${player.teamId}` : "Sin equipo";
  const status = player ? getPlayerStatus(player) : "Sin equipo";

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
            <Input label="Telefono" value={player.phone} disabled leftIcon={<Phone size={14} />} />
            <Input label="Correo" value={player.email} disabled leftIcon={<Mail size={14} />} />
            <Input label="Estatus" value={status} disabled leftIcon={<Hash size={14} />} />
            <Input label="Equipo" value={teamName} disabled leftIcon={<Hash size={14} />} />
            <Input label="Posicion" value={player.position} disabled leftIcon={<Hash size={14} />} />
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
