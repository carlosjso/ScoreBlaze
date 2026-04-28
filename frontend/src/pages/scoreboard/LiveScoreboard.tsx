import { useEffect, useMemo, useState } from "react";

import type { ScoreboardState } from "@/pages/scoreboard/Scoreboard.types";
import { useParams } from "react-router-dom";
import { useScoreboard } from "@/pages/scoreboard/hooks/useScoreboard";

function createFallbackState(): ScoreboardState {
  return {
    teamA: {
      key: "A",
      name: "Frailes",
      logo: undefined,
      score: 0,
      fouls: 0,
      selectedPlayer: "A1",
      players: ["A1", "A2", "A3", "A4", "A5"],
    },
    teamB: {
      key: "B",
      name: "Warriors",
      logo: undefined,
      score: 0,
      fouls: 0,
      selectedPlayer: "B1",
      players: ["B1", "B2", "B3", "B4", "B5"],
    },
    history: [],
    arrow: "A",
    controlMode: "buttons",
    period: 1,
    clockSeconds: 600,
    shotClockSeconds: 24,
    clockRunning: false,
  };
}

function readStoredState(storageKey: string): ScoreboardState {
  try {
    const rawState = localStorage.getItem(storageKey);

    if (!rawState) {
      return createFallbackState();
    }

    return {
      ...createFallbackState(),
      ...JSON.parse(rawState),
    };
  } catch (error) {
    console.error("No se pudo leer el estado del marcador visual:", error);
    return createFallbackState();
  }
}

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatShotClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  return String(safeSeconds).padStart(2, "0");
}

function getLastEventText(state: ScoreboardState) {
  const lastEvent = state.history[state.history.length - 1];
  return lastEvent?.text ?? "SIN JUGADAS RECIENTES";
}

export default function LiveScoreboard() {
  const { matchId } = useParams<{ matchId: string }>();

  const storageKey = matchId
    ? `scoreboard.state.v1.${matchId}`
    : "scoreboard.state.v1";

  const [state, setState] = useState<ScoreboardState>(() =>
    readStoredState(storageKey),
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setState(readStoredState(storageKey));
    }, 300);

    function handleStorageChange(event: StorageEvent) {
      if (event.key === storageKey) {
        setState(readStoredState(storageKey));
      }
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [storageKey]);

  const clockText = useMemo(
    () => formatClock(state.clockSeconds),
    [state.clockSeconds],
  );
  const shotClockText = useMemo(
    () => formatShotClock(state.shotClockSeconds),
    [state.shotClockSeconds],
  );

  const lastEventText = useMemo(() => getLastEventText(state), [state]);
  const arrowToA = state.arrow === "A";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.06),transparent_22%),linear-gradient(145deg,#f6f7f9,#eceff4)] p-2 text-slate-800 sm:p-3">
      <section className="mx-auto grid min-h-[calc(100vh-28px)] w-full max-w-[1500px] grid-rows-[auto_auto_1fr_auto] gap-5 rounded-[30px] border border-slate-200 bg-white/85 p-5 shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
        <div className="relative flex min-h-[110px] items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(249,115,22,0.08),rgba(255,255,255,0)_36%,rgba(255,255,255,0)_70%,rgba(249,115,22,0.06))]" />

          <h1 className="relative z-10 text-7xl font-black tracking-[0.08em] text-slate-800 sm:text-8xl lg:text-9xl">
            {clockText}
          </h1>

          <div className="absolute left-[calc(50%+210px)] top-[58%] z-10 flex -translate-y-1/2 flex-col items-center rounded-2xl border border-orange-200 bg-white px-5 py-3 shadow-[0_8px_18px_rgba(17,24,39,0.08)]">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-orange-700">
              Tiro
            </span>

            <span className="text-4xl font-black leading-none text-slate-950">
              {shotClockText}
            </span>
          </div>
        </div>

        <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div />

          <div className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-8 text-xl font-black text-white shadow-[0_10px_24px_rgba(249,115,22,0.25)]">
            CUARTO {state.period}
          </div>

          <div className="text-center text-sm font-black uppercase tracking-wide text-slate-500 lg:text-right">
            {lastEventText}
          </div>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_240px_1fr]">
          <article
            className={[
              "flex min-h-[390px] flex-col items-center justify-center gap-5 rounded-3xl border bg-white p-5 text-center shadow-[0_10px_30px_rgba(17,24,39,0.08)]",
              arrowToA ? "border-orange-300" : "border-slate-200",
            ].join(" ")}
          >
            <div className="grid aspect-square w-[188px] place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-2">
              {state.teamA.logo ? (
                <img
                  src={state.teamA.logo}
                  alt={state.teamA.name}
                  className="h-[92%] w-[92%] object-contain drop-shadow"
                />
              ) : (
                <span className="text-5xl font-black text-orange-500">
                  {state.teamA.name.slice(0, 1)}
                </span>
              )}
            </div>

            <div
              className={[
                "w-full max-w-[210px] rounded-full border bg-gradient-to-b from-white to-slate-50 px-4 py-2 text-base font-black uppercase tracking-[0.08em] shadow-sm",
                arrowToA
                  ? "border-orange-300 text-orange-700 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]"
                  : "border-slate-200 text-slate-700",
              ].join(" ")}
            >
              {state.teamA.name}
            </div>

            <div className="grid aspect-square w-[126px] place-items-center rounded-[28px] border-2 border-orange-200 bg-slate-50">
              <span className="text-6xl font-black text-orange-700">
                {state.teamA.score}
              </span>
            </div>
          </article>

          <div className="flex flex-col justify-center gap-5">
            <div className="grid min-h-[145px] place-items-center rounded-3xl border border-slate-200 bg-white shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
              <span className="text-7xl font-black leading-none text-orange-500">
                VS
              </span>
            </div>

            <div className="flex min-h-[165px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-orange-50 p-4 shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
              <div className="text-8xl font-black leading-none text-orange-500">
                {arrowToA ? "◀" : "▶"}
              </div>

              <div className="mt-3 text-center text-sm font-black uppercase tracking-[0.18em] text-orange-700">
                Posesión {state.arrow}
              </div>
            </div>
          </div>

          <article
            className={[
              "flex min-h-[440px] flex-col items-center justify-center gap-4 rounded-3xl border bg-white p-6 text-center shadow-[0_10px_30px_rgba(17,24,39,0.08)]",
              !arrowToA ? "border-orange-300" : "border-slate-200",
            ].join(" ")}
          >
            <div className="grid aspect-square w-[175px] place-items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50 p-2">
              {state.teamB.logo ? (
                <img
                  src={state.teamB.logo}
                  alt={state.teamB.name}
                  className="h-[92%] w-[92%] object-contain drop-shadow"
                />
              ) : (
                <span className="text-6xl font-black text-orange-500">
                  {state.teamB.name.slice(0, 1)}
                </span>
              )}
            </div>

            <div
              className={[
                "w-full max-w-[180px] rounded-full border bg-gradient-to-b from-white to-slate-50 px-4 py-2 text-sm font-black uppercase tracking-[0.08em] shadow-sm",
                !arrowToA
                  ? "border-orange-300 text-orange-700 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]"
                  : "border-slate-200 text-slate-700",
              ].join(" ")}
            >
              {state.teamB.name}
            </div>

            <div className="grid aspect-square w-[155px] place-items-center rounded-[32px] border-2 border-orange-200 bg-slate-50">
              <span className="text-8xl font-black text-orange-700">
                {state.teamB.score}
              </span>
            </div>
          </article>
        </div>

        <footer className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-center shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">
              Faltas {state.teamA.name}
            </p>

            <p className="mt-1 text-4xl font-black text-slate-800">
              {state.teamA.fouls}
            </p>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-8 py-4 text-center text-sm font-black uppercase tracking-[0.12em] text-orange-700 shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
            ScoreBlaze Live
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-center shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">
              Faltas {state.teamB.name}
            </p>

            <p className="mt-1 text-5xl font-black text-slate-800">
              {state.teamB.fouls}
            </p>
          </div>
        </footer>
      </section>
    </main>
  );
}
