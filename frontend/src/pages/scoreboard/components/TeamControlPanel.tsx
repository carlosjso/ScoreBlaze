import type {
  ScoreboardHistoryEvent,
  ScoreboardTeamKey,
  ScoreboardTeamState,
} from "@/pages/scoreboard/Scoreboard.types";

type TeamControlPanelProps = {
  team: ScoreboardTeamState;
  history: ScoreboardHistoryEvent[];
  disabled?: boolean;
  onSelectPlayer: (team: ScoreboardTeamKey, player: string) => void;
  onAddPoints: (points: number, team: ScoreboardTeamKey) => void;
  onMiss: (team: ScoreboardTeamKey) => void;
  onFoul: (team: ScoreboardTeamKey) => void;
  onRebound: (team: ScoreboardTeamKey) => void;
  onAssist: (team: ScoreboardTeamKey) => void;
};

export function TeamControlPanel({
  team,
  history,
  disabled = false,
  onSelectPlayer,
  onAddPoints,
  onMiss,
  onFoul,
  onRebound,
  onAssist,
}: TeamControlPanelProps) {
  const hasSelectedPlayer = Boolean(team.selectedPlayer);
  const controlsDisabled = disabled || !hasSelectedPlayer;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{team.name}</h3>

      <label className="mt-4 block text-sm font-semibold text-slate-600">
        Jugador seleccionado
      </label>

      <select
        value={team.selectedPlayer ?? ""}
        onChange={(event) => onSelectPlayer(team.key, event.target.value)}
        disabled={disabled}
        className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none"
      >
        {team.players.length === 0 ? (
          <option value="">Sin jugadores registrados</option>
        ) : (
          team.players.map((player) => (
            <option key={player.key} value={player.key}>
              {player.label}
            </option>
          ))
        )}
      </select>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button
          onClick={() => onAddPoints(1, team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          +1
        </button>

        <button
          onClick={() => onAddPoints(2, team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          +2
        </button>

        <button
          onClick={() => onAddPoints(3, team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          +3
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onMiss(team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800"
        >
          Fallo
        </button>

        <button
          onClick={() => onFoul(team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
        >
          Falta
        </button>

        <button
          onClick={() => onRebound(team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800"
        >
          Rebote
        </button>

        <button
          onClick={() => onAssist(team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800"
        >
          Asistencia
        </button>
      </div>

      <div className="mt-5 max-h-60 overflow-auto rounded-2xl bg-slate-50 p-4">
        <p className="mb-3 text-sm font-black text-slate-700">Historial</p>

        {history.length === 0 ? (
          <p className="text-sm text-slate-400">Sin eventos</p>
        ) : (
          <div className="space-y-2">
            {history.map((event) => (
              <p key={event.id} className="text-sm font-semibold text-slate-700">
                &gt; {event.text}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
