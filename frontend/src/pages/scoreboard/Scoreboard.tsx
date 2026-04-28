import { useScoreboard } from "@/pages/scoreboard/hooks/useScoreboard";
import { ScoreboardDisplay } from "@/pages/scoreboard/components/ScoreboardDisplay";
import { TeamControlPanel } from "@/pages/scoreboard/components/TeamControlPanel";
import { GeneralControls } from "@/pages/scoreboard/components/GeneralControls";
import { useScoreboardKeyboard } from "@/pages/scoreboard/hooks/useScoreboardKeyboard";
import { KeyboardHelp } from "@/pages/scoreboard/components/KeyboardHelp";
import { useParams } from "react-router-dom";
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

  console.log("[scoreboard] Partido actual:", currentMatch);

  const {
    state,
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
    resetGame,
  } = useScoreboard({ matchId: numericMatchId });

  const historyA = state.history
    .filter((event) => event.team === "A")
    .slice()
    .reverse();
  const historyB = state.history
    .filter((event) => event.team === "B")
    .slice()
    .reverse();
  useScoreboardKeyboard({
    enabled: true,
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
          Primera migración del marcador HTML a React con estado local.
        </p>
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
                No se encontró el partido #{numericMatchId}
              </span>
            )}
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
          history={historyA}
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
          onUndo={undo}
          onResetGame={resetGame}
        />
        <TeamControlPanel
          team={state.teamB}
          history={historyB}
          onSelectPlayer={selectPlayer}
          onAddPoints={addPoints}
          onMiss={miss}
          onFoul={foul}
          onRebound={rebound}
          onAssist={assist}
        />
      </div>
      <KeyboardHelp />
    </section>
  );
}
