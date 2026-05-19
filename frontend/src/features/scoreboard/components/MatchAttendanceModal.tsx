import { Trash2, UserPlus, UsersRound } from "lucide-react";
import { useState } from "react";

import type {
  ScoreboardPlayerOption,
  ScoreboardTeamKey,
  ScoreboardTeamState,
} from "@/features/scoreboard/Scoreboard.types";
import { Modal } from "@/shared/components/ui/Modal";

type MatchAttendanceModalProps = {
  isOpen: boolean;
  onClose: () => void;
  teamA: ScoreboardTeamState;
  teamB: ScoreboardTeamState;
  disabled?: boolean;
  onSelectPlayer: (team: ScoreboardTeamKey, player: string) => void;
  onSetParticipation: (
    team: ScoreboardTeamKey,
    player: string,
    updates: {
      isPresent?: boolean;
      didPlay?: boolean;
    },
  ) => void;
  onAddGuest: (
    team: ScoreboardTeamKey,
    guestName: string,
    guestShirtNumber?: string,
  ) => void;
  onRemoveGuest: (team: ScoreboardTeamKey, player: string) => void;
};

function getPlayerNumber(player: ScoreboardPlayerOption) {
  const shirtNumber = player.shirtNumber?.trim();
  if (shirtNumber) {
    return shirtNumber;
  }

  const numberInLabel = player.label.match(/\d+/)?.[0];
  if (numberInLabel) {
    return numberInLabel;
  }

  return player.label.trim().slice(0, 3).toUpperCase();
}

function getPlayerName(player: ScoreboardPlayerOption) {
  const trimmedName = player.name.trim();
  if (trimmedName) {
    return trimmedName;
  }

  return player.label.trim();
}

function TeamAttendanceSection({
  team,
  disabled = false,
  onSelectPlayer,
  onSetParticipation,
  onAddGuest,
  onRemoveGuest,
}: {
  team: ScoreboardTeamState;
  disabled?: boolean;
  onSelectPlayer: (team: ScoreboardTeamKey, player: string) => void;
  onSetParticipation: MatchAttendanceModalProps["onSetParticipation"];
  onAddGuest: MatchAttendanceModalProps["onAddGuest"];
  onRemoveGuest: MatchAttendanceModalProps["onRemoveGuest"];
}) {
  const [guestFormOpen, setGuestFormOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestShirtNumber, setGuestShirtNumber] = useState("");
  const rosterPlayers = team.players.filter(
    (player) => player.playerId !== null || player.key.startsWith("guest-temp:"),
  );
  const presentCount = rosterPlayers.filter((player) => player.isPresent).length;
  const playedCount = rosterPlayers.filter((player) => player.didPlay).length;

  const handleAddGuest = () => {
    const trimmedGuestName = guestName.trim();
    if (!trimmedGuestName) {
      return;
    }

    const trimmedGuestShirtNumber = guestShirtNumber.trim();
    onAddGuest(
      team.key,
      trimmedGuestName,
      trimmedGuestShirtNumber || undefined,
    );
    setGuestName("");
    setGuestShirtNumber("");
    setGuestFormOpen(false);
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Equipo
          </p>
          <h4 className="mt-1 text-xl font-black text-slate-950">{team.name}</h4>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setGuestFormOpen((current) => !current);
              setGuestName("");
              setGuestShirtNumber("");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={14} />
            {guestFormOpen ? "Cerrar invitado" : "Agregar invitado"}
          </button>

          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-700">
            {presentCount} llegaron
          </span>
          <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">
            {playedCount} jugaron
          </span>
        </div>
      </div>

      {guestFormOpen ? (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50/40 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600">
            Invitado temporal
          </p>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddGuest();
                }
              }}
              placeholder={`Nombre del invitado para ${team.name}`}
              className="h-11 min-w-0 flex-1 rounded-2xl border border-orange-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300"
            />

            <input
              value={guestShirtNumber}
              onChange={(event) => setGuestShirtNumber(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAddGuest();
                }
              }}
              placeholder="No."
              maxLength={4}
              className="h-11 w-full rounded-2xl border border-orange-200 bg-white px-3 text-center text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-300 sm:w-[84px] sm:flex-none"
            />

            <div className="flex gap-2 sm:flex-none">
              <button
                type="button"
                disabled={disabled || !guestName.trim()}
                onClick={handleAddGuest}
                className="h-10 rounded-2xl bg-orange-500 px-3.5 text-xs font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Agregar
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setGuestName("");
                  setGuestShirtNumber("");
                  setGuestFormOpen(false);
                }}
                className="h-10 rounded-2xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {rosterPlayers.map((player) => {
          const isActive = player.key === team.selectedPlayer;
          const isTemporaryGuest = player.key.startsWith("guest-temp:");

          return (
            <div
              key={player.key}
              className={[
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition",
                isActive
                  ? "border-orange-200 bg-orange-50/50"
                  : "border-slate-200 bg-slate-50/70",
              ].join(" ")}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectPlayer(team.key, player.key)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className={[
                    "grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black",
                    isActive ? "bg-orange-500 text-white" : "bg-white text-slate-900",
                  ].join(" ")}
                >
                  {getPlayerNumber(player)}
                </span>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {getPlayerName(player)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {player.isPresent ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-700">
                        Llego
                      </span>
                    ) : null}
                    {player.didPlay ? (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-orange-700">
                        Jugo
                      </span>
                    ) : null}
                    {!player.isPresent && !player.didPlay ? (
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Sin marcar
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onSetParticipation(team.key, player.key, player.isPresent
                      ? { isPresent: false, didPlay: false }
                      : { isPresent: true })
                  }
                  className={[
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                    player.isPresent
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700",
                  ].join(" ")}
                >
                  {player.isPresent ? "Llego" : "Marcar llegada"}
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onSetParticipation(team.key, player.key, player.didPlay
                      ? { didPlay: false }
                      : { isPresent: true, didPlay: true })
                  }
                  className={[
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                    player.didPlay
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-700",
                  ].join(" ")}
                >
                  {player.didPlay ? "Jugo" : "Marcar jugo"}
                </button>

                {isTemporaryGuest ? (
                  <button
                    type="button"
                    disabled={disabled || player.didPlay}
                    onClick={() => onRemoveGuest(team.key, player.key)}
                    title={
                      player.didPlay
                        ? "No puedes eliminar un invitado que ya jugo"
                        : "Eliminar invitado"
                    }
                    className="grid h-9 w-9 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Trash2 size={15} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MatchAttendanceModal({
  isOpen,
  onClose,
  teamA,
  teamB,
  disabled = false,
  onSelectPlayer,
  onSetParticipation,
  onAddGuest,
  onRemoveGuest,
}: MatchAttendanceModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lista del partido"
      maxWidthClassName="max-w-6xl"
    >
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_68%,#f8fafc_100%)] p-4 shadow-sm">
        <div className="flex flex-wrap items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-orange-200 bg-white text-orange-600 shadow-sm">
            <UsersRound size={20} />
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-lg font-black text-slate-950">
              Control de llegada y participacion
            </h4>
            <p className="mt-1 text-sm text-slate-500">
              Marca quienes llegaron al partido y quienes ya jugaron. Solo los que llegaron se veran arriba en cada equipo.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <TeamAttendanceSection
          team={teamA}
          disabled={disabled}
          onSelectPlayer={onSelectPlayer}
          onSetParticipation={onSetParticipation}
          onAddGuest={onAddGuest}
          onRemoveGuest={onRemoveGuest}
        />

        <TeamAttendanceSection
          team={teamB}
          disabled={disabled}
          onSelectPlayer={onSelectPlayer}
          onSetParticipation={onSetParticipation}
          onAddGuest={onAddGuest}
          onRemoveGuest={onRemoveGuest}
        />
      </div>
    </Modal>
  );
}
