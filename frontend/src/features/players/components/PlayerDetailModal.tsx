import { CircleUserRound, Hash, Mail, Phone, UsersRound } from "lucide-react";

import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import type { PlayerListItem } from "@/features/players/Players.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { Button, Input, Modal } from "@/shared/components/ui";

type PlayerLeagueParticipationProps = {
  leagueName: string;
  teamName: string;
  playerMatchesPlayed: number;
  teamMatchesPlayed: number;
  participationRate: number | null;
  loading?: boolean;
  error?: string | null;
};

type PlayerDetailModalProps = {
  player: PlayerListItem | null;
  isOpen: boolean;
  onClose: () => void;
  leagueParticipation?: PlayerLeagueParticipationProps | null;
};

function formatParticipationRate(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("es-MX", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function PlayerDetailModal({
  player,
  isOpen,
  onClose,
  leagueParticipation = null,
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

          {leagueParticipation ? (
            <section className="rounded-[24px] border border-orange-200 bg-[linear-gradient(135deg,#fffaf5_0%,#ffffff_62%,#fff7ed_100%)] p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600">
                    En esta liga
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{leagueParticipation.leagueName}</p>
                </div>

                <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-700">
                  {leagueParticipation.teamName}
                </span>
              </div>

              {leagueParticipation.loading ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
                  Calculando participacion del jugador...
                </div>
              ) : leagueParticipation.error ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  No pudimos calcular la participacion en la liga.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Equipo</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{leagueParticipation.teamName}</p>
                  </div>

                  <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Partidos jugados</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {leagueParticipation.playerMatchesPlayed} de {leagueParticipation.teamMatchesPlayed}
                    </p>
                  </div>

                  <div className="rounded-[18px] border border-orange-200 bg-orange-50/70 px-4 py-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-500">Participacion</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatParticipationRate(leagueParticipation.participationRate)}
                    </p>
                  </div>
                </div>
              )}
            </section>
          ) : null}

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

