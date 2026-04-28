import type {
  ScoreboardPlayerOption,
  ScoreboardControlMode,
  ScoreboardHistoryEvent,
  ScoreboardTeamKey,
  ScoreboardTeamState,
} from "@/pages/scoreboard/Scoreboard.types";

type TeamControlPanelProps = {
  team: ScoreboardTeamState;
  controlMode: ScoreboardControlMode;
  history: ScoreboardHistoryEvent[];
  disabled?: boolean;
  onSelectPlayer: (team: ScoreboardTeamKey, player: string) => void;
  onAddPoints: (points: number, team: ScoreboardTeamKey) => void;
  onMiss: (team: ScoreboardTeamKey) => void;
  onFoul: (team: ScoreboardTeamKey) => void;
  onRebound: (team: ScoreboardTeamKey) => void;
  onAssist: (team: ScoreboardTeamKey) => void;
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

function getPlayerShortName(player: ScoreboardPlayerOption) {
  const name = getPlayerName(player);
  return name.split(/\s+/)[0] ?? name;
}

export function TeamControlPanel({
  team,
  controlMode,
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
  const keyboardMode = controlMode === "keyboard";
  const controlsDisabled = disabled || !hasSelectedPlayer || keyboardMode;
  const selectionDisabled = disabled;
  const shortcuts =
    team.key === "A"
      ? {
          point1: "Q",
          point2: "W",
          point3: "E",
          miss: "A",
          foul: "S",
          rebound: "D",
          assist: "F",
        }
      : {
          point1: "U",
          point2: "I",
          point3: "O",
          miss: "J",
          foul: "K",
          rebound: "L",
          assist: "N",
        };
  const withShortcut = (label: string, shortcut: string) =>
    keyboardMode ? `${label} [${shortcut}]` : label;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-black tracking-tight text-slate-950">
        {team.name}
      </h3>

      <div className="mt-4">
        <p className="text-sm font-semibold text-slate-600">
          Jugador activo
        </p>

        {team.players.length === 0 ? (
          <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-500">
            Sin jugadores registrados
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-1 lg:grid-cols-6">
            {team.players.map((player) => {
              const selected = player.key === team.selectedPlayer;

              return (
                <button
                  key={player.key}
                  type="button"
                  onClick={() => onSelectPlayer(team.key, player.key)}
                  disabled={selectionDisabled}
                  className={[
                    "flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition disabled:cursor-not-allowed disabled:opacity-50",
                    selected
                      ? "border-orange-300 bg-orange-50 text-orange-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                  title={getPlayerName(player)}
                >
                  <span
                    className={[
                      "grid h-7 min-w-7 shrink-0 place-items-center rounded-md px-1 text-[11px] font-black",
                      selected
                        ? "bg-orange-500 text-white"
                        : "bg-slate-100 text-slate-950",
                    ].join(" ")}
                  >
                    {getPlayerNumber(player)}
                  </span>

                  <span
                    className={[
                      "block max-w-full truncate text-[9px] font-semibold leading-tight",
                      selected ? "text-orange-700" : "text-slate-600",
                    ].join(" ")}
                  >
                    {getPlayerShortName(player)}
                  </span>

                  {selected ? (
                    <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-orange-500">
                      Activo
                    </span>
                  ) : null}
                  {!selected ? (
                    <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-slate-300">
                      &nbsp;
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <button
          onClick={() => onAddPoints(1, team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut("+1", shortcuts.point1)}
        </button>

        <button
          onClick={() => onAddPoints(2, team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut("+2", shortcuts.point2)}
        </button>

        <button
          onClick={() => onAddPoints(3, team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut("+3", shortcuts.point3)}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => onMiss(team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut("Fallo", shortcuts.miss)}
        </button>

        <button
          onClick={() => onFoul(team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut("Falta", shortcuts.foul)}
        </button>

        <button
          onClick={() => onRebound(team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut("Rebote", shortcuts.rebound)}
        </button>

        <button
          onClick={() => onAssist(team.key)}
          disabled={controlsDisabled}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut("Asistencia", shortcuts.assist)}
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
