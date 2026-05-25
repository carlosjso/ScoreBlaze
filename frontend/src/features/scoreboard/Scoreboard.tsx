import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";

import { leagueTrackedStatOptions } from "@/features/leagues/Leagues.types";
import { quickMatchesQueryKeys, quickMatchesService } from "@/features/quick-matches/QuickMatches.service";
import type {
  MatchMutationPayload,
  MatchStatus,
} from "@/features/quick-matches/QuickMatches.types";
import { MatchAttendanceModal } from "@/features/scoreboard/components/MatchAttendanceModal";
import { TeamControlPanel } from "@/features/scoreboard/components/TeamControlPanel";
import { GeneralControls } from "@/features/scoreboard/components/GeneralControls";
import { KeyboardHelp } from "@/features/scoreboard/components/KeyboardHelp";
import { ScoreboardDisplay } from "@/features/scoreboard/components/ScoreboardDisplay";
import { useScoreboard } from "@/features/scoreboard/hooks/useScoreboard";
import { useScoreboardKeyboard } from "@/features/scoreboard/hooks/useScoreboardKeyboard";

type MatchStatusUpdate = Extract<MatchStatus, "live" | "finished">;

export default function Scoreboard() {
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const { matchId } = useParams();
  const numericMatchId = matchId ? Number(matchId) : undefined;
  const queryClient = useQueryClient();
  const matchQuery = useQuery({
    queryKey: quickMatchesQueryKeys.detail(numericMatchId ?? 0),
    enabled: Boolean(numericMatchId),
    queryFn: ({ signal }) => quickMatchesService.getMatch(numericMatchId!, signal),
  });
  const currentMatch = matchQuery.data ?? null;
  const trackedStats = currentMatch?.tracked_stats ?? [...leagueTrackedStatOptions];
  const canTrackMiss = trackedStats.includes("Fallo");
  const canTrackFoul = trackedStats.includes("Faltas");
  const canTrackAssist = trackedStats.includes("Asistencias");
  const canTrackRebound = trackedStats.includes("Rebotes");

  const {
    state,
    loading: loadingScoreboard,
    syncError,
    realtimeStatus,
    formattedClock,
    formattedShotClock,
    selectPlayer,
    setPlayerParticipation,
    addGuestPlayer,
    removeGuestPlayer,
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
    matchSetup: null,
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
        match_date: currentMatch.match_date,
        start_time: currentMatch.start_time,
        end_time: currentMatch.end_time,
        team_a_id: currentMatch.team_a_id,
        team_b_id: currentMatch.team_b_id,
        league_id: currentMatch.league_id,
        score_team_a: scoreTeamA,
        score_team_b: scoreTeamB,
        winner_team_id:
          scoreTeamA === scoreTeamB
            ? null
            : scoreTeamA > scoreTeamB
              ? currentMatch.team_a_id
              : currentMatch.team_b_id,
        is_draw: scoreTeamA === scoreTeamB,
        court: currentMatch.court,
        tournament: currentMatch.tournament,
        tracked_stats: currentMatch.tracked_stats,
        status: nextStatus,
      } satisfies MatchMutationPayload;

      return quickMatchesService.updateMatch(numericMatchId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: quickMatchesQueryKeys.all });
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
  const handleMiss = (team: "A" | "B") => {
    if (!canTrackMiss) {
      return;
    }
    miss(team);
  };
  const handleFoul = (team: "A" | "B") => {
    if (!canTrackFoul) {
      return;
    }
    foul(team);
  };
  const handleRebound = (team: "A" | "B") => {
    if (!canTrackRebound) {
      return;
    }
    rebound(team);
  };
  const handleAssist = (team: "A" | "B") => {
    if (!canTrackAssist) {
      return;
    }
    assist(team);
  };

  useScoreboardKeyboard({
    enabled: !loadingScoreboard && state.controlMode === "keyboard",
    onAddPoints: addPoints,
    onMiss: handleMiss,
    onFoul: handleFoul,
    onRebound: handleRebound,
    onAssist: handleAssist,
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
            {matchQuery.isPending ? (
              "Cargando partido..."
            ) : matchQuery.error instanceof Error ? (
              <span className="text-red-600">{matchQuery.error.message}</span>
            ) : currentMatch ? (
              `Partido: ${state.teamA.name} vs ${state.teamB.name}`
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
          trackedStats={trackedStats}
          controlMode={state.controlMode}
          history={historyA}
          disabled={controlsDisabled}
          onSelectPlayer={selectPlayer}
          onAddPoints={addPoints}
          onMiss={handleMiss}
          onFoul={handleFoul}
          onRebound={handleRebound}
          onAssist={handleAssist}
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
          onOpenAttendanceModal={() => setAttendanceModalOpen(true)}
        />

        <TeamControlPanel
          team={state.teamB}
          trackedStats={trackedStats}
          controlMode={state.controlMode}
          history={historyB}
          disabled={controlsDisabled}
          onSelectPlayer={selectPlayer}
          onAddPoints={addPoints}
          onMiss={handleMiss}
          onFoul={handleFoul}
          onRebound={handleRebound}
          onAssist={handleAssist}
        />
      </div>

      <MatchAttendanceModal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        teamA={state.teamA}
        teamB={state.teamB}
        disabled={controlsDisabled}
        onSelectPlayer={selectPlayer}
        onSetParticipation={setPlayerParticipation}
        onAddGuest={addGuestPlayer}
        onRemoveGuest={removeGuestPlayer}
      />

      {state.controlMode === "keyboard" ? <KeyboardHelp /> : null}
    </section>
  );
}

