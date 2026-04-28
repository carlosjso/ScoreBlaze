import { useParams } from "react-router-dom";

import { TeamControlPanel } from "@/pages/scoreboard/components/TeamControlPanel";
import { GeneralControls } from "@/pages/scoreboard/components/GeneralControls";
import { KeyboardHelp } from "@/pages/scoreboard/components/KeyboardHelp";
import { ScoreboardDisplay } from "@/pages/scoreboard/components/ScoreboardDisplay";
import { useScoreboard } from "@/pages/scoreboard/hooks/useScoreboard";
import { useScoreboardKeyboard } from "@/pages/scoreboard/hooks/useScoreboardKeyboard";
import { useQuickMatchesData } from "@/pages/quick-matches/hooks/useQuickMatchesData";

export default function Scoreboard() {
  const { matchId } = useParams();
  const numericMatchId = matchId ? Number(matchId) : undefined;
  const {
    matches,
    loading: loadingMatches,
    error: matchesError,
  } = useQuickMatchesData();

  const currentMatch = numericMatchId
    ? matches.find((match) => match.id === numericMatchId)
    : null;

  const {
    state,
    loading: loadingScoreboard,
    syncError,
    realtimeStatus,
    formattedClock,
    formattedShotClock,
    selectPlayer,
    addPoints,
    assist,
    miss,
    rebound,
    foul,
    undo,
    toggleClock,
    resetClock,
    resetShotClock24,
    setShotClock14,
    nextPeriod,
    toggleArrow,
    setControlMode,
    resetGame,
  } = useScoreboard({
    matchId: numericMatchId,
    matchSetup: currentMatch
      ? {
          teamAId: currentMatch.teamAId,
          teamBId: currentMatch.teamBId,
          teamAName: currentMatch.teamAName,
          teamBName: currentMatch.teamBName,
          scoreTeamA: currentMatch.scoreTeamA,
          scoreTeamB: currentMatch.scoreTeamB,
        }
      : null,
  });

  const historyA = state.history
    .filter((event) => event.team === "A")
    .slice()
    .reverse();
  const historyB = state.history
    .filter((event) => event.team === "B")
    .slice()
    .reverse();

  useScoreboardKeyboard({
    enabled: !loadingScoreboard && state.controlMode === "keyboard",
    onAddPoints: addPoints,
    onMiss: miss,
    onFoul: foul,
    onRebound: rebound,
    onAssist: assist,
    onToggleClock: toggleClock,
    onResetClock: resetClock,
    onResetShotClock24: resetShotClock24,
    onSetShotClock14: setShotClock14,
    onNextPeriod: nextPeriod,
    onUndo: undo,
    onToggleArrow: toggleArrow,
    onResetGame: resetGame,
  });

  const realtimeStatusMeta = (() => {
    if (realtimeStatus === "connected") {
      return {
        label: "Conexion estable",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    }

    if (realtimeStatus === "reconnecting") {
      return {
        label: "Recuperando conexion",
        className: "border-amber-200 bg-amber-50 text-amber-700",
      };
    }

    if (realtimeStatus === "connecting") {
      return {
        label: "Conectando marcador",
        className: "border-sky-200 bg-sky-50 text-sky-700",
      };
    }

    return {
      label: "Sin partido abierto",
      className: "border-slate-200 bg-slate-100 text-slate-600",
    };
  })();

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-500">
          Marcador en vivo
        </p>

        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Control de partido
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Usa este panel para llevar el marcador, registrar jugadas y manejar el reloj del partido.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={[
              "inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.16em]",
              realtimeStatusMeta.className,
            ].join(" ")}
          >
            {realtimeStatusMeta.label}
          </span>
        </div>

        {numericMatchId ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            {loadingMatches ? (
              "Cargando partido..."
            ) : matchesError ? (
              <span className="text-red-600">{matchesError}</span>
            ) : currentMatch ? (
              `Partido: ${currentMatch.teamAName} vs ${currentMatch.teamBName}`
            ) : (
              <span className="text-red-600">
                No encontramos el partido #{numericMatchId}
              </span>
            )}
          </div>
        ) : null}

        {loadingScoreboard ? (
          <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
            Preparando marcador, reloj y jugadores del partido...
          </div>
        ) : null}

        {syncError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {syncError}
          </div>
        ) : null}
      </div>

      <ScoreboardDisplay
        state={state}
        formattedClock={formattedClock}
        formattedShotClock={formattedShotClock}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px_1fr]">
        <TeamControlPanel
          team={state.teamA}
          controlMode={state.controlMode}
          history={historyA}
          disabled={loadingScoreboard}
          onSelectPlayer={selectPlayer}
          onAddPoints={addPoints}
          onMiss={miss}
          onFoul={foul}
          onRebound={rebound}
          onAssist={assist}
        />

        <GeneralControls
          state={state}
          onToggleClock={toggleClock}
          onResetClock={resetClock}
          onResetShotClock24={resetShotClock24}
          onSetShotClock14={setShotClock14}
          onNextPeriod={nextPeriod}
          onToggleArrow={toggleArrow}
          onSetControlMode={setControlMode}
          onUndo={undo}
          onResetGame={resetGame}
        />

        <TeamControlPanel
          team={state.teamB}
          controlMode={state.controlMode}
          history={historyB}
          disabled={loadingScoreboard}
          onSelectPlayer={selectPlayer}
          onAddPoints={addPoints}
          onMiss={miss}
          onFoul={foul}
          onRebound={rebound}
          onAssist={assist}
        />
      </div>

      {state.controlMode === "keyboard" ? <KeyboardHelp /> : null}
    </section>
  );
}
