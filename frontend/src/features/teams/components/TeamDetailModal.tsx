import { CircleUserRound, Hash, Mail, Phone, UsersRound } from "lucide-react";

import { TeamLogo } from "@/features/teams/components/TeamLogo";
import type { TeamListItem } from "@/features/teams/Teams.types";
import { Button, Input, Modal } from "@/shared/components/ui";

type TeamDetailModalProps = {
  team: TeamListItem | null;
  isOpen: boolean;
  onClose: () => void;
};

function getPlayerInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeamDetailModal({ team, isOpen, onClose }: TeamDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Equipo" maxWidthClassName="max-w-2xl">
      {team ? (
        <div className="space-y-4">
          <TeamLogo
            name={team.name}
            logoBase64={team.logoBase64}
            seed={team.id}
            className="mx-auto h-20 w-20 rounded-2xl text-base"
            imageClassName="p-2"
            emptyClassName="text-slate-600"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input label="Nombre" value={team.name} disabled leftIcon={<CircleUserRound size={14} />} />
            <Input label="ID" value={String(team.id)} disabled leftIcon={<Hash size={14} />} />
            <Input
              label="Responsable"
              value={team.responsibleName || "Sin responsable"}
              disabled
              leftIcon={<CircleUserRound size={14} />}
            />
            <Input
              label="Telefono"
              value={team.responsiblePhone || "Sin telefono"}
              disabled
              leftIcon={<Phone size={14} />}
            />
            <Input
              label="Correo"
              value={team.responsibleEmail || "Sin correo"}
              disabled
              leftIcon={<Mail size={14} />}
            />
            <Input
              label="Plantilla"
              value={`${team.playerCount} ${team.playerCount === 1 ? "jugador" : "jugadores"}`}
              disabled
              leftIcon={<UsersRound size={14} />}
            />
            <Input label="Estado" value={team.rosterStatus} disabled leftIcon={<Hash size={14} />} />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-600">Jugadores</p>
              <p className="text-xs font-semibold text-slate-500">
                {team.playerCount} {team.playerCount === 1 ? "registrado" : "registrados"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {team.players.length > 0 ? (
                <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {team.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-800">
                        {getPlayerInitials(player.name)}
                      </span>

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-slate-800">
                          {player.name}
                        </span>
                        <span
                          className="block truncate text-xs text-slate-500"
                          title={player.email}
                        >
                          <Mail size={12} className="mr-1 inline" />
                          {player.email}
                        </span>
                      </span>
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

