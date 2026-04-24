import { CircleUserRound, Hash, Mail, UsersRound } from "lucide-react";

import type { TeamListItem } from "@/pages/teams/Teams.types";
import { Button, Input, Modal } from "@/shared/components/ui";

type TeamDetailModalProps = {
  team: TeamListItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function TeamDetailModal({ team, isOpen, onClose }: TeamDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Equipo" maxWidthClassName="max-w-lg">
      {team ? (
        <div className="space-y-4">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-300 bg-slate-100 text-sm font-bold text-slate-600">
            {team.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 3)
              .toUpperCase()}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Nombre" value={team.name} disabled leftIcon={<CircleUserRound size={14} />} />
            <Input label="ID" value={String(team.id)} disabled leftIcon={<Hash size={14} />} />
            <Input
              label="Plantilla"
              value={`${team.playerCount} ${team.playerCount === 1 ? "jugador" : "jugadores"}`}
              disabled
              leftIcon={<UsersRound size={14} />}
            />
            <Input label="Estado" value={team.rosterStatus} disabled leftIcon={<Hash size={14} />} />
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-slate-600">Jugadores</p>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
              {team.players.length > 0 ? (
                <div className="space-y-2">
                  {team.players.map((player) => (
                    <div key={player.id} className="rounded-xl border border-slate-200 px-3 py-2">
                      <p className="text-sm font-medium text-slate-800">{player.name}</p>
                      <p className="text-xs text-slate-500">
                        <Mail size={12} className="mr-1 inline" />
                        {player.email}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Este equipo todavia no tiene jugadores asignados.</p>
              )}
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
