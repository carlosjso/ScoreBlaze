import { CircleUserRound, Hash, Mail, Phone, UsersRound } from "lucide-react";

import { PlayerPhoto } from "@/pages/players/components/PlayerPhoto";
import type { PlayerListItem } from "@/pages/players/Players.types";
import { TeamLogo } from "@/pages/teams/components/TeamLogo";
import { Button, Input, Modal } from "@/shared/components/ui";

type PlayerDetailModalProps = {
  player: PlayerListItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function PlayerDetailModal({
  player,
  isOpen,
  onClose,
}: PlayerDetailModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Jugador"
      maxWidthClassName="max-w-2xl"
    >
      {player ? (
        <div className="space-y-5">
          <PlayerPhoto
            name={player.name}
            photoBase64={player.photoBase64}
            className="mx-auto h-20 w-20 text-base"
            emptyClassName="text-slate-600"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nombre"
              value={player.name}
              disabled
              leftIcon={<CircleUserRound size={14} />}
            />
            <Input
              label="Telefono"
              value={player.phone || "Sin telefono"}
              disabled
              leftIcon={<Phone size={14} />}
            />
            <Input
              label="Correo"
              value={player.email}
              disabled
              leftIcon={<Mail size={14} />}
            />
            <Input
              label="Estatus"
              value={player.status}
              disabled
              leftIcon={<Hash size={14} />}
            />
            <Input
              label="Equipos"
              value={`${player.teamsCount} ${player.teamsCount === 1 ? "equipo" : "equipos"}`}
              disabled
              leftIcon={<UsersRound size={14} />}
              className="sm:col-span-2"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-600">Equipos</p>
              <p className="text-xs font-semibold text-slate-500">
                {player.teamsCount} {player.teamsCount === 1 ? "asignado" : "asignados"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {player.teams.length > 0 ? (
                <div className="grid max-h-[260px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                  {player.teams.map((team) => (
                    <div
                      key={`${player.id}-${team.id}`}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <TeamLogo
                        name={team.name}
                        logoBase64={team.logoBase64}
                        seed={team.id}
                        className="h-10 w-10 shrink-0 rounded-xl text-xs"
                        imageClassName="p-1.5"
                        emptyClassName="border-slate-200 bg-slate-100 text-slate-800"
                      />

                      <span className="min-w-0">
                        <span
                          className="block truncate text-sm font-semibold text-slate-800"
                          title={team.name}
                        >
                          {team.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          Equipo asignado
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Sin equipo asignado.</p>
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
