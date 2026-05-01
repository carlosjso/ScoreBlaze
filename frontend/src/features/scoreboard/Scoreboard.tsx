import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { quickMatchesQueryKeys, quickMatchesService } from "@/features/quick-matches/QuickMatches.service";
import type {
  MatchMutationPayload,
  MatchStatus,
} from "@/features/quick-matches/QuickMatches.types";
import { TeamControlPanel } from "@/features/scoreboard/components/TeamControlPanel";
import { GeneralControls } from "@/features/scoreboard/components/GeneralControls";
import { KeyboardHelp } from "@/features/scoreboard/components/KeyboardHelp";
import { ScoreboardDisplay } from "@/features/scoreboard/components/ScoreboardDisplay";
import { useScoreboard } from "@/features/scoreboard/hooks/useScoreboard";
import { useScoreboardKeyboard } from "@/features/scoreboard/hooks/useScoreboardKeyboard";
import { useQuickMatchesData } from "@/features/quick-matches/hooks/useQuickMatchesData";

type MatchStatusUpdate = Extract<MatchStatus, "live" | "finished">;

export default function Scoreboard() {
  const { matchId } = useParams();
  const numericMatchId = matchId ? Number(matchId) : undefined;
  const queryClient = useQueryClient();
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
    awaitPendingSync,
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
  const matchStatusMutation = useMutation({
    mutationFn: async (nextStatus: MatchStatusUpdate) => {
      if (!numericMatchId || !currentMatch) {
        throw new Error("No encontramos el partido para actualizar su estado.");
      }

      await awaitPendingSync();

      const scoreTeamA = state.teamA.score;
      const scoreTeamB = state.teamB.score;
      const payload = {
        match_date: currentMatch.matchDate,
        start_time: `${currentMatch.startTime}:00`,
        end_time: `${currentMatch.endTime}:00`,
        team_a_id: currentMatch.teamAId,
        team_b_id: currentMatch.teamBId,
        score_team_a: scoreTeamA,
        score_team_b: scoreTeamB,
        winner_team_id:
          scoreTeamA === scoreTeamB
            ? null
            : scoreTeamA > scoreTeamB
              ? currentMatch.teamAId
              : currentMatch.teamBId,
        is_draw: scoreTeamA === scoreTeamB,
        court: currentMatch.court || null,
        tournament: currentMatch.tournament || null,
        status: nextStatus,
      } satisfies MatchMutationPayload;

      return quickMatchesService.updateMatch(numericMatchId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.snapshot() });
    },
  });
  const pendingMatchStatus = matchStatusMutation.isPending
    ? matchStatusMutation.variables
    : null;
  const controlsDisabled = loadingScoreboard || matchStatusMutation.isPending;
  const matchStatusError =
    matchStatusMutation.error instanceof Error ? matchStatusMutation.error.message : null;

  const handleStartMatch = () => {
    if (currentMatch?.status === "live" || matchStatusMutation.isPending) {
      return;
    }

    const confirmed = window.confirm(
      currentMatch?.status === "finished"
        ? "El partido volvera a estado en juego sin borrar el marcador actual. Deseas continuar?"
        : "El partido cambiara a estado en juego. Deseas continuar?",
    );

    if (!confirmed) {
      return;
    }

    void matchStatusMutation.mutateAsync("live");
  };

  const handleFinishMatch = () => {
    if (currentMatch?.status === "finished" || matchStatusMutation.isPending) {
      return;
    }

    const confirmed = window.confirm(
      "Se guardara el marcador actual y el partido quedara como finalizado. Deseas continuar?",
    );

    if (!confirmed) {
      return;
    }

    if (state.clockRunning) {
      toggleClock();
    }

    void matchStatusMutation.mutateAsync("finished");
  };

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

        {matchStatusError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {matchStatusError}
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
          disabled={controlsDisabled}
          onSelectPlayer={selectPlayer}
          onAddPoints={addPoints}
          onMiss={miss}
          onFoul={foul}
          onRebound={rebound}
          onAssist={assist}
        />

        <GeneralControls
          state={state}
          disabled={matchStatusMutation.isPending}
          onToggleClock={toggleClock}
          onResetClock={resetClock}
          onResetShotClock24={resetShotClock24}
          onSetShotClock14={setShotClock14}
          onNextPeriod={nextPeriod}
          onToggleArrow={toggleArrow}
          onSetControlMode={setControlMode}
          onUndo={undo}
          onResetGame={resetGame}
          onStartMatch={numericMatchId ? handleStartMatch : undefined}
          startMatchActive={currentMatch?.status === "live"}
          startMatchDisabled={!currentMatch || currentMatch.status === "live"}
          startMatchPending={pendingMatchStatus === "live"}
          startMatchLabel={
            currentMatch?.status === "live" ? "Partido iniciado" : "Iniciar partido"
          }
          onFinishMatch={numericMatchId ? handleFinishMatch : undefined}
          finishMatchActive={currentMatch?.status === "finished"}
          finishMatchDisabled={!currentMatch || currentMatch.status === "finished"}
          finishMatchPending={pendingMatchStatus === "finished"}
          finishMatchLabel={
            currentMatch?.status === "finished" ? "Partido finalizado" : "Finalizar partido"
          }
        />

        <TeamControlPanel
          team={state.teamB}
          controlMode={state.controlMode}
          history={historyB}
          disabled={controlsDisabled}
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

