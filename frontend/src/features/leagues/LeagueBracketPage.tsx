import { CalendarDays, Check, Dices, GripVertical, ListOrdered, Maximize2, Minus, RotateCcw, Shuffle, Shield, Trash2, Trophy, UsersRound, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import { getCompetitionCapabilities } from "@/features/leagues/competitionCapabilities";
import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { buildGroupQualificationOrder, orderTeamsByStandings, useLeagueMatchesMutations } from "@/features/leagues/hooks/useLeagueMatchesMutations";
import { summarizeGroupSchedule, summarizeLeagueSchedule } from "@/features/leagues/leagueScheduleCoverage";
import type { ApiTeamOption, QuickMatchListItem } from "@/features/quick-matches/QuickMatches.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { Button, PageHeader, Panel } from "@/shared/components/ui";

function getRoundLabel(teamCount: number) {
  if (teamCount <= 2) return "Final";
  if (teamCount <= 4) return "Semifinales";
  if (teamCount <= 8) return "Cuartos";
  if (teamCount <= 16) return "Octavos";
  return "Ronda inicial";
}

function getBracketMatches(matches: QuickMatchListItem[]) {
  const pathOrder = { PLAY_IN: 0, WINNERS: 1, LOSERS: 2, MAIN: 3, THIRD_PLACE: 4, GRAND_FINAL: 5 } as const;
  const bracketGames = matches
    .filter((match) => match.competitionStage === "FINAL_PHASE" && match.bracketRound !== null && match.bracketSlot !== null)
    .sort((left, right) => (pathOrder[left.bracketPath ?? "MAIN"] - pathOrder[right.bracketPath ?? "MAIN"]) || (left.bracketRound ?? 0) - (right.bracketRound ?? 0) || (left.bracketSlot ?? 0) - (right.bracketSlot ?? 0));
  const gamesBySeries = new Map<string, QuickMatchListItem[]>();

  bracketGames.forEach((match) => {
    const key = `${match.bracketPath ?? "MAIN"}:${match.bracketRound}:${match.bracketSlot}`;
    const series = gamesBySeries.get(key) ?? [];
    series.push(match);
    gamesBySeries.set(key, series);
  });

  return Array.from(gamesBySeries.values()).map((unsortedGames) => {
    const games = [...unsortedGames].sort((left, right) => (left.bracketGame ?? 1) - (right.bracketGame ?? 1));
    const firstGame = games[0];
    const activeGame = games.find((game) => game.status !== "finished") ?? games[games.length - 1];
    if (!firstGame || !activeGame || firstGame.bracketSeriesMode === "SINGLE" || firstGame.bracketSeriesMode === null) {
      return activeGame;
    }

    const canonicalTeamAId = firstGame.teamAId;
    const canonicalTeamBId = firstGame.teamBId;
    let scoreTeamA = 0;
    let scoreTeamB = 0;
    let seriesWinnerTeamId: number | null = null;
    const finishedGames = games.filter((game) => game.status === "finished" && game.winnerTeamId !== null);

    if (firstGame.bracketSeriesMode === "BEST_OF") {
      finishedGames.forEach((game) => {
        if (game.winnerTeamId === canonicalTeamAId) scoreTeamA += 1;
        if (game.winnerTeamId === canonicalTeamBId) scoreTeamB += 1;
      });
      const requiredWins = Math.floor((firstGame.bracketSeriesBestOf ?? 1) / 2) + 1;
      if (scoreTeamA >= requiredWins) seriesWinnerTeamId = canonicalTeamAId;
      if (scoreTeamB >= requiredWins) seriesWinnerTeamId = canonicalTeamBId;
    } else {
      finishedGames.slice(0, 2).forEach((game) => {
        if (game.teamAId === canonicalTeamAId) {
          scoreTeamA += game.scoreTeamA ?? 0;
          scoreTeamB += game.scoreTeamB ?? 0;
        } else {
          scoreTeamA += game.scoreTeamB ?? 0;
          scoreTeamB += game.scoreTeamA ?? 0;
        }
      });
      if (finishedGames.length >= 2 && scoreTeamA !== scoreTeamB) {
        seriesWinnerTeamId = scoreTeamA > scoreTeamB ? canonicalTeamAId : canonicalTeamBId;
      } else if (finishedGames.length >= 3) {
        seriesWinnerTeamId = finishedGames[2].winnerTeamId;
      }
    }

    const baseTournament = firstGame.tournament.replace(/\s+-\s+Juego\s+\d+$/i, "");
    const seriesLabel = firstGame.bracketSeriesMode === "BEST_OF"
      ? `Serie ${scoreTeamA}-${scoreTeamB}`
      : `Global ${scoreTeamA}-${scoreTeamB}`;

    return {
      ...activeGame,
      teamAId: canonicalTeamAId,
      teamBId: canonicalTeamBId,
      teamAName: firstGame.teamAName,
      teamBName: firstGame.teamBName,
      teamALogoBase64: firstGame.teamALogoBase64,
      teamBLogoBase64: firstGame.teamBLogoBase64,
      scoreTeamA,
      scoreTeamB,
      scoreLabel: `${scoreTeamA} - ${scoreTeamB}`,
      winnerTeamId: seriesWinnerTeamId,
      tournament: `${baseTournament} · ${seriesLabel}`,
      status: seriesWinnerTeamId ? "finished" : activeGame.status,
    } satisfies QuickMatchListItem;
  }).sort((left, right) => (pathOrder[left.bracketPath ?? "MAIN"] - pathOrder[right.bracketPath ?? "MAIN"]) || (left.bracketRound ?? 0) - (right.bracketRound ?? 0) || (left.bracketSlot ?? 0) - (right.bracketSlot ?? 0));
}

function getBracketSize(teamCount: number) {
  return Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, teamCount))));
}

function getBracketSeedOrder(size: number): number[] {
  if (size <= 2) return [1, 2].slice(0, size);
  return getBracketSeedOrder(size / 2).flatMap((seed) => [seed, size + 1 - seed]);
}

function getRoundTitle(bracketSize: number, roundIndex: number) {
  const teamsInRound = bracketSize / 2 ** roundIndex;

  if (teamsInRound <= 2) return "Final";
  if (teamsInRound <= 4) return "Semifinal";
  if (teamsInRound <= 8) return "Cuartos";
  if (teamsInRound <= 16) return "Octavos";
  return `${teamsInRound}avos`;
}

function getScore(value: number | null) {
  return value === null ? "-" : String(value);
}

type BracketParticipant = {
  id: number;
  name: string;
  logo: string | null;
};

function getMatchWinner(match?: QuickMatchListItem): BracketParticipant | null {
  if (!match || match.winnerTeamId === null) return null;
  if (match.winnerTeamId === match.teamAId) {
    return { id: match.teamAId, name: match.teamAName, logo: match.teamALogoBase64 };
  }
  if (match.winnerTeamId === match.teamBId) {
    return { id: match.teamBId, name: match.teamBName, logo: match.teamBLogoBase64 };
  }
  return null;
}

function MatchNode({
  match,
  projectedTeams,
  label,
  left,
  top,
  width,
  fixedHeight,
  absolute = true,
  onClick,
  highlightFinal = false,
}: {
  match?: QuickMatchListItem;
  projectedTeams?: [BracketParticipant | null, BracketParticipant | null];
  label: string;
  left: number;
  top: number;
  width: number;
  fixedHeight?: number;
  absolute?: boolean;
  onClick?: () => void;
  highlightFinal?: boolean;
}) {
  const rows = match
    ? [
        {
          id: match.teamAId,
          name: match.teamAName,
          logo: match.teamALogoBase64,
          score: getScore(match.scoreTeamA),
          winner: match.winnerTeamId === match.teamAId,
        },
        {
          id: match.teamBId,
          name: match.teamBName,
          logo: match.teamBLogoBase64,
          score: getScore(match.scoreTeamB),
          winner: match.winnerTeamId === match.teamBId,
        },
      ]
    : (projectedTeams ?? [null, null]).map((team) => ({
        id: team?.id ?? 0,
        name: team?.name ?? "Por definir",
        logo: team?.logo ?? null,
        score: "-",
        winner: false,
      }));

  if (highlightFinal) {
    return (
      <button
        type="button"
        disabled={!match}
        onClick={onClick}
        className={`${absolute ? "absolute" : "relative"} overflow-hidden rounded-[22px] border-2 border-orange-400 bg-white text-left shadow-[0_14px_34px_rgba(249,115,22,0.2)] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_20px_40px_rgba(249,115,22,0.28)] disabled:cursor-default disabled:opacity-90`}
        style={
          absolute
            ? {
                left,
                top,
                width,
                ...(fixedHeight ? { minHeight: fixedHeight } : {}),
                animation: "sbFinalBreath 3.1s ease-in-out infinite",
              }
            : { width, ...(fixedHeight ? { minHeight: fixedHeight } : {}), animation: "sbFinalBreath 3.1s ease-in-out infinite" }
        }
      >
        <div className="w-full overflow-hidden rounded-[18px] border border-orange-200 bg-white">
          <div className="border-b border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.18em] text-orange-600">
            Gran final
          </div>
          <div className="flex items-center gap-2 border-b border-orange-200 px-3 py-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[11px] font-black text-white shadow-[0_0_0_3px_rgba(254,215,170,.9)]">
              {rows[0].name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{rows[0].name}</span>
            <span className="font-black text-orange-500">{rows[0].score}</span>
          </div>
          <div className="border-b border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">
            VS
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[11px] font-black text-white shadow-[0_0_0_3px_rgba(254,215,170,.9)]">
              {rows[1].name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-800">{rows[1].name}</span>
            <span className="font-black text-orange-500">{rows[1].score}</span>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={!match}
      onClick={onClick}
      className={`${absolute ? "absolute" : "relative"} overflow-hidden rounded-[14px] border border-slate-200 bg-white text-left shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition enabled:hover:-translate-y-0.5 enabled:hover:border-orange-300 enabled:hover:shadow-[0_14px_26px_rgba(249,115,22,0.14)] disabled:cursor-default disabled:opacity-80`}
      style={absolute ? { left, top, width } : { width }}
    >
      <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {match?.court || match?.tournament || label}
      </div>
      {rows.map((row, rowIndex) => (
        <div
          key={`${label}-${row.id}-${row.name}-${rowIndex}`}
          className={`relative flex items-center gap-2 border-b px-3 py-2 last:border-b-0 ${row.winner ? "border-slate-100 bg-orange-50 text-orange-700" : "border-slate-100 text-slate-800"}`}
        >
          <TeamLogo
            name={row.name}
            logoBase64={row.logo}
            seed={row.id}
            className="h-8 w-8 shrink-0 rounded-full border border-orange-100 bg-white text-[10px] font-black uppercase text-orange-600 shadow-sm"
            imageClassName="p-[1px]"
          />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">{row.name}</span>
          <span className="font-black text-slate-500">{row.score}</span>
        </div>
      ))}
    </button>
  );
}

function BracketCanvas({
  matches,
  qualifiedTeams,
  reseedEachRound,
  onOpenMatch,
}: {
  matches: QuickMatchListItem[];
  qualifiedTeams: number;
  reseedEachRound: boolean;
  onOpenMatch: (match: QuickMatchListItem) => void;
}) {
  const [viewScale, setViewScale] = useState(1);
  const [fitMode, setFitMode] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const MIN_VIEW_SCALE = 0.4;
  const MAX_VIEW_SCALE = 1.35;
  const STEP_VIEW_SCALE = 0.1;
  const clampedScale = Math.min(Math.max(viewScale, MIN_VIEW_SCALE), MAX_VIEW_SCALE);

  const resolveWinner = (match?: QuickMatchListItem) => {
    if (!match) return { name: "Por definir", logo: null as string | null, seed: 0 };
    if (match.winnerTeamId === match.teamAId) return { name: match.teamAName, logo: match.teamALogoBase64, seed: match.teamAId };
    if (match.winnerTeamId === match.teamBId) return { name: match.teamBName, logo: match.teamBLogoBase64, seed: match.teamBId };
    return { name: "Por definir", logo: null as string | null, seed: 0 };
  };

  const bracketSize = matches[0]?.bracketSize ?? getBracketSize(qualifiedTeams);
  const matchByPosition = new Map(matches.map((match) => [`${match.bracketRound}:${match.bracketSlot}`, match]));
  const getPositionMatch = (round: number, slot: number) => matchByPosition.get(`${round}:${slot}`);
  const getProjectedTeams = (round: number, slot: number): [BracketParticipant | null, BracketParticipant | null] => {
    if (round <= 1 || reseedEachRound) return [null, null];
    return [
      getMatchWinner(getPositionMatch(round - 1, slot * 2 - 1)),
      getMatchWinner(getPositionMatch(round - 1, slot * 2)),
    ];
  };
  const sideRounds = Math.max(1, Math.log2(bracketSize) - 1);
  const cardWidth = 220;
  const cardHeight = 118;
  const finalCardHeight = 184;
  const finalWidth = 220;
  const columnGap = 56;
  const firstRoundPerSide = Math.max(1, bracketSize / 4);
  const vGap = 22;
  const headerTop = 30;
  const sideStartX = 10;
  const roundsContentH = firstRoundPerSide * cardHeight + Math.max(0, firstRoundPerSide - 1) * vGap;
  const totalContentH = Math.max(cardHeight, finalCardHeight + 24, roundsContentH);
  const totalHeight = headerTop + totalContentH + 16;

  const leftXs = Array.from({ length: sideRounds }, (_, round) => sideStartX + round * (cardWidth + columnGap));
  const leftLastX = leftXs[sideRounds - 1];
  const finalX = leftLastX + cardWidth + columnGap;
  const rightStartX = finalX + finalWidth + columnGap;
  const rightXs = Array.from({ length: sideRounds }, (_, round) => rightStartX + (sideRounds - 1 - round) * (cardWidth + columnGap));
  const totalWidth = rightXs[0] + cardWidth + 10;
  const scale = 1;
  const canvasWidth = bracketSize === 8 ? 1320 : totalWidth;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !fitMode || bracketSize === 4) return undefined;

    const updateFitScale = () => {
      const availableWidth = Math.max(0, viewport.clientWidth - 32);
      const nextScale = Math.min(1, Math.max(MIN_VIEW_SCALE, availableWidth / canvasWidth));
      setViewScale((current) => (Math.abs(current - nextScale) < 0.005 ? current : nextScale));
    };

    updateFitScale();
    const observer = new ResizeObserver(updateFitScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [bracketSize, canvasWidth, fitMode]);

  const updateZoom = (nextScale: number) => {
    setFitMode(false);
    setViewScale(Math.min(MAX_VIEW_SCALE, Math.max(MIN_VIEW_SCALE, nextScale)));
  };

  const zoomControls = (
    <div className="mb-3 flex min-w-0 w-full flex-col gap-3 rounded-[16px] bg-slate-50/90 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-700">Vista de la llave</p>
        <p className="mt-0.5 text-[11px] text-slate-500">Desplazate horizontalmente o ajusta el zoom.</p>
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => updateZoom(clampedScale - STEP_VIEW_SCALE)}
          disabled={clampedScale <= MIN_VIEW_SCALE}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40"
          title="Alejar"
          aria-label="Alejar la llave"
        >
          <Minus size={15} />
        </button>
        <input
          type="range"
          min={MIN_VIEW_SCALE * 100}
          max={MAX_VIEW_SCALE * 100}
          step={5}
          value={Math.round(clampedScale * 100)}
          onChange={(event) => updateZoom(Number(event.target.value) / 100)}
          className="h-1.5 w-24 cursor-pointer accent-orange-500 sm:w-32"
          aria-label="Nivel de zoom de la llave"
        />
        <span className="min-w-[46px] text-center text-xs font-bold tabular-nums text-slate-600">{Math.round(clampedScale * 100)}%</span>
        <button
          type="button"
          onClick={() => updateZoom(clampedScale + STEP_VIEW_SCALE)}
          disabled={clampedScale >= MAX_VIEW_SCALE}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 disabled:opacity-40"
          title="Acercar"
          aria-label="Acercar la llave"
        >
          <Plus size={15} />
        </button>
        <button
          type="button"
          onClick={() => setFitMode(true)}
          className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition ${fitMode ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:text-orange-600"}`}
          title="Ajustar toda la llave al espacio disponible"
        >
          <Maximize2 size={14} />
          Ver completa
        </button>
        <button
          type="button"
          onClick={() => updateZoom(1)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-orange-200 hover:text-orange-600"
          title="Restablecer zoom al 100%"
        >
          <RotateCcw size={13} />
          100%
        </button>
      </div>
    </div>
  );

  const svgLines: string[] = [];

  if (bracketSize === 4) {
    const semiA = getPositionMatch(1, 1);
    const semiB = getPositionMatch(1, 2);
    const finalistA = semiA
      ? semiA.winnerTeamId === semiA.teamAId
        ? { name: semiA.teamAName, logo: semiA.teamALogoBase64, seed: semiA.teamAId }
        : semiA.winnerTeamId === semiA.teamBId
          ? { name: semiA.teamBName, logo: semiA.teamBLogoBase64, seed: semiA.teamBId }
          : { name: "Por definir", logo: null, seed: 0 }
      : { name: "Por definir", logo: null, seed: 0 };
    const finalistB = semiB
      ? semiB.winnerTeamId === semiB.teamAId
        ? { name: semiB.teamAName, logo: semiB.teamALogoBase64, seed: semiB.teamAId }
        : semiB.winnerTeamId === semiB.teamBId
          ? { name: semiB.teamBName, logo: semiB.teamBLogoBase64, seed: semiB.teamBId }
          : { name: "Por definir", logo: null, seed: 0 }
      : { name: "Por definir", logo: null, seed: 0 };

    const SemiCard = ({
      match,
      title,
      onClick,
    }: {
      match?: QuickMatchListItem;
      title: string;
      onClick?: () => void;
    }) => (
      <button
        type="button"
        disabled={!match}
        onClick={onClick}
        className="w-full overflow-hidden rounded-[16px] border border-slate-200 bg-white text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:border-orange-300 enabled:hover:shadow-md disabled:cursor-default"
      >
        <div className="bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{title}</div>
        <div className="space-y-2 p-3">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo
                name={match?.teamAName ?? "Por definir"}
                logoBase64={match?.teamALogoBase64 ?? null}
                seed={match?.teamAId ?? 0}
                className="h-9 w-9 shrink-0 rounded-full border border-orange-100 bg-white text-[10px] font-black uppercase text-orange-600 shadow-sm"
                imageClassName="p-[1px]"
              />
              <span className="truncate text-xs font-semibold text-slate-600">{match?.teamAName ?? "Por definir"}</span>
            </div>
            <span className="text-sm font-black text-slate-500">{match?.scoreTeamA ?? "-"}</span>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <TeamLogo
                name={match?.teamBName ?? "Por definir"}
                logoBase64={match?.teamBLogoBase64 ?? null}
                seed={match?.teamBId ?? 0}
                className="h-9 w-9 shrink-0 rounded-full border border-orange-100 bg-white text-[10px] font-black uppercase text-orange-600 shadow-sm"
                imageClassName="p-[1px]"
              />
              <span className="truncate text-xs font-semibold text-slate-600">{match?.teamBName ?? "Por definir"}</span>
            </div>
            <span className="text-sm font-black text-slate-500">{match?.scoreTeamB ?? "-"}</span>
          </div>
        </div>
      </button>
    );

    return (
      <div className="min-w-0 w-full max-w-full rounded-[24px] bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_44%,#f8fafc_100%)] p-4">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(260px,1fr)_56px_minmax(280px,1.08fr)_56px_minmax(260px,1fr)]">
          <SemiCard match={semiA} title="Semifinal 1" onClick={semiA ? () => onOpenMatch(semiA) : undefined} />

          <div className="hidden h-px w-full bg-orange-200 lg:block" />

          <div className="rounded-[24px] border border-orange-200 bg-white px-4 py-5 text-center shadow-[0_10px_24px_rgba(249,115,22,0.12)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Gran final</p>
            <div className="mt-3 grid gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-slate-900">
                <TeamLogo
                  name={finalistA.name}
                  logoBase64={finalistA.logo}
                  seed={finalistA.seed}
                  className="h-9 w-9 shrink-0 rounded-full border border-orange-100 bg-white shadow-sm"
                  imageClassName="p-[1px]"
                />
                <span className="truncate text-xs font-semibold text-slate-600">{finalistA.name}</span>
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-600">vs</div>
              <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-slate-900">
                <TeamLogo
                  name={finalistB.name}
                  logoBase64={finalistB.logo}
                  seed={finalistB.seed}
                  className="h-9 w-9 shrink-0 rounded-full border border-orange-100 bg-white shadow-sm"
                  imageClassName="p-[1px]"
                />
                <span className="truncate text-xs font-semibold text-slate-600">{finalistB.name}</span>
              </div>
            </div>
          </div>

          <div className="hidden h-px w-full bg-orange-200 lg:block" />

          <SemiCard match={semiB} title="Semifinal 2" onClick={semiB ? () => onOpenMatch(semiB) : undefined} />
        </div>
      </div>
    );
  }

  if (bracketSize === 8) {
    const NODE_WIDTH = 220;
    const quarterHeight = 96;
    const semiHeight = 116;
    const baseWidth = 1320;
    const baseHeight = 360;
    const xLeftQuarter = 0;
    const xLeftSemi = 300;
    const xFinal = 550;
    const xRightSemi = 800;
    const xRightQuarter = 1040;
    const yQuarterTop = 40;
    const yQuarterBottom = 190;
    const ySemi = 115;
    const qf1 = getPositionMatch(1, 1);
    const qf2 = getPositionMatch(1, 2);
    const qf3 = getPositionMatch(1, 3);
    const qf4 = getPositionMatch(1, 4);
    const semiA = getPositionMatch(2, 1);
    const semiB = getPositionMatch(2, 2);
    const projectedSemiA = getProjectedTeams(2, 1);
    const projectedSemiB = getProjectedTeams(2, 2);
    const finalistA = resolveWinner(semiA);
    const finalistB = resolveWinner(semiB);

    const sideCardClass =
      "overflow-hidden rounded-[16px] border border-slate-200 bg-white text-left shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition enabled:hover:-translate-y-0.5 enabled:hover:border-orange-300 enabled:hover:shadow-[0_14px_26px_rgba(249,115,22,0.14)]";

    const QuarterCard = ({ title, match }: { title: string; match?: QuickMatchListItem }) => (
      <button type="button" disabled={!match} onClick={match ? () => onOpenMatch(match) : undefined} className={`${sideCardClass} w-[220px]`}>
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{title}</div>
        <div className="space-y-0.5">
          {[0, 1].map((rowIndex) => {
            const isA = rowIndex === 0;
            const name = isA ? match?.teamAName : match?.teamBName;
            const logo = isA ? match?.teamALogoBase64 : match?.teamBLogoBase64;
            const seed = isA ? match?.teamAId : match?.teamBId;
            const score = isA ? getScore(match?.scoreTeamA ?? null) : getScore(match?.scoreTeamB ?? null);
            return (
              <div key={`${title}-${rowIndex}`} className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0">
                <TeamLogo
                  name={name ?? "Por definir"}
                  logoBase64={logo ?? null}
                  seed={seed ?? 0}
                  className="h-8 w-8 shrink-0 rounded-full border border-orange-100 bg-white text-[10px] font-black uppercase text-orange-600 shadow-sm"
                  imageClassName="p-[1px]"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600" title={name ?? "Por definir"}>{name ?? "Por definir"}</span>
                <span className="font-black text-slate-500">{score}</span>
              </div>
            );
          })}
        </div>
      </button>
    );

    const SemiSlot = ({ title, match, projectedTeams }: { title: string; match?: QuickMatchListItem; projectedTeams: [BracketParticipant | null, BracketParticipant | null] }) => (
      <button type="button" disabled={!match} onClick={match ? () => onOpenMatch(match) : undefined} className={`${sideCardClass} min-h-[116px] w-[220px]`}>
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{title}</div>
        <div className="p-2.5 space-y-2">
          {[0, 1].map((rowIndex) => {
            const isA = rowIndex === 0;
            const projectedTeam = projectedTeams[rowIndex];
            const name = (isA ? match?.teamAName : match?.teamBName) ?? projectedTeam?.name;
            const logo = (isA ? match?.teamALogoBase64 : match?.teamBLogoBase64) ?? projectedTeam?.logo;
            const seed = (isA ? match?.teamAId : match?.teamBId) ?? projectedTeam?.id;
            const score = isA ? getScore(match?.scoreTeamA ?? null) : getScore(match?.scoreTeamB ?? null);
            return (
              <div key={`${title}-${rowIndex}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-2">
                <TeamLogo name={name ?? "Por definir"} logoBase64={logo ?? null} seed={seed ?? 0} className="h-8 w-8 shrink-0 rounded-full border border-orange-100 bg-white shadow-sm" imageClassName="p-[1px]" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600" title={name ?? "Por definir"}>{name ?? "Por definir"}</span>
                <span className="font-black text-slate-500">{score}</span>
              </div>
            );
          })}
        </div>
      </button>
    );

    const qfTopCenter = yQuarterTop + quarterHeight / 2;
    const qfBottomCenter = yQuarterBottom + quarterHeight / 2;
    const semiCenter = ySemi + semiHeight / 2;

    return (
      <div className="min-w-0 w-full max-w-full">
        {zoomControls}
        <div ref={viewportRef} tabIndex={0} aria-label="Llave desplazable horizontalmente" className="sb-bracket-scroll w-full max-w-full overflow-x-scroll rounded-[22px] border border-slate-200 bg-white/70 p-4 pb-5">
          <div className="relative mx-auto" style={{ width: baseWidth * clampedScale, height: baseHeight * clampedScale }}>
            <div style={{ width: baseWidth, transform: `scale(${clampedScale})`, transformOrigin: "top left" }}>
              <div className="relative h-[360px] w-[1320px]">
                <svg className="pointer-events-none absolute inset-0" width={baseWidth} height={baseHeight}>
                  <path d={`M ${xLeftQuarter + NODE_WIDTH} ${qfTopCenter} H 260 V ${qfBottomCenter} H ${xLeftQuarter + NODE_WIDTH}`} stroke="#fb923c" strokeWidth="1.7" fill="none" />
                  <path d={`M 260 ${semiCenter} H ${xLeftSemi}`} stroke="#fb923c" strokeWidth="1.7" fill="none" />
                  <path d={`M ${xRightQuarter} ${qfTopCenter} H 1030 V ${qfBottomCenter} H ${xRightQuarter}`} stroke="#fb923c" strokeWidth="1.7" fill="none" />
                  <path d={`M ${xRightSemi + NODE_WIDTH} ${semiCenter} H 1030`} stroke="#fb923c" strokeWidth="1.7" fill="none" />
                  <path d={`M ${xLeftSemi + NODE_WIDTH} ${semiCenter} H ${xFinal}`} stroke="#fb923c" strokeWidth="1.7" fill="none" />
                  <path d={`M ${xFinal + NODE_WIDTH} ${semiCenter} H ${xRightSemi}`} stroke="#fb923c" strokeWidth="1.7" fill="none" />
                </svg>

                <div className="absolute left-0 top-[8px] w-[220px] text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cuartos</div>
                <div className="absolute left-[300px] top-[50px] w-[220px] text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Semifinal</div>
                <div className="absolute left-[550px] top-[50px] w-[220px] text-center text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Final</div>
                <div className="absolute left-[800px] top-[50px] w-[220px] text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Semifinal</div>
                <div className="absolute left-[1040px] top-[8px] w-[220px] text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Cuartos</div>

                <div className="absolute left-0 top-[40px]"><QuarterCard title="Cuartos 1" match={qf1} /></div>
                <div className="absolute left-0 top-[190px]"><QuarterCard title="Cuartos 2" match={qf2} /></div>
                <div className="absolute left-[300px] top-[115px]"><SemiSlot title="Semifinal 1" match={semiA} projectedTeams={projectedSemiA} /></div>

                <div className="absolute left-[550px] top-[95px] w-[220px] rounded-[24px] border border-orange-200 bg-white px-4 py-5 text-center shadow-[0_10px_24px_rgba(249,115,22,0.12)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Gran final</p>
                  <div className="mt-3 grid gap-2">
                    <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2">
                      <TeamLogo name={finalistA.name} logoBase64={finalistA.logo} seed={finalistA.seed} className="h-9 w-9 shrink-0 rounded-full border border-orange-100 bg-white shadow-sm" imageClassName="object-cover" />
                      <span className="truncate text-xs font-semibold text-slate-600" title={finalistA.name}>{finalistA.name}</span>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-600">vs</div>
                    <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2">
                      <TeamLogo name={finalistB.name} logoBase64={finalistB.logo} seed={finalistB.seed} className="h-9 w-9 shrink-0 rounded-full border border-orange-100 bg-white shadow-sm" imageClassName="object-cover" />
                      <span className="truncate text-xs font-semibold text-slate-600" title={finalistB.name}>{finalistB.name}</span>
                    </div>
                  </div>
                </div>

                <div className="absolute left-[800px] top-[115px]"><SemiSlot title="Semifinal 2" match={semiB} projectedTeams={projectedSemiB} /></div>
                <div className="absolute left-[1040px] top-[40px]"><QuarterCard title="Cuartos 3" match={qf3} /></div>
                <div className="absolute left-[1040px] top-[190px]"><QuarterCard title="Cuartos 4" match={qf4} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const firstRoundCenters = Array.from({ length: firstRoundPerSide }, (_, index) => headerTop + cardHeight / 2 + index * (cardHeight + vGap));
  const leftRoundCenters: number[][] = [firstRoundCenters];
  const rightRoundCenters: number[][] = [firstRoundCenters];
  for (let round = 1; round < sideRounds; round += 1) {
    const prev = leftRoundCenters[round - 1];
    const next = Array.from({ length: Math.max(1, Math.floor(prev.length / 2)) }, (_, idx) => (prev[idx * 2] + prev[idx * 2 + 1]) / 2);
    leftRoundCenters.push(next);
    rightRoundCenters.push(next);
  }

  const addLine = (x1: number, y1: number, x2: number, y2: number, color = "#f97316", width = 1.8) => {
    svgLines.push(
      `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" />`,
    );
  };

  for (let round = 0; round < sideRounds - 1; round += 1) {
    const current = leftRoundCenters[round];
    const next = leftRoundCenters[round + 1];
    current.forEach((center, index) => {
      const targetCenter = next[Math.floor(index / 2)];
      const startX = leftXs[round] + cardWidth;
      const endX = leftXs[round + 1];
      const midX = (startX + endX) / 2;
      addLine(startX, center, midX, center);
      addLine(midX, center, midX, targetCenter);
      addLine(midX, targetCenter, endX, targetCenter);
    });
  }

  for (let round = 0; round < sideRounds - 1; round += 1) {
    const current = rightRoundCenters[round];
    const next = rightRoundCenters[round + 1];
    current.forEach((center, index) => {
      const targetCenter = next[Math.floor(index / 2)];
      const startX = rightXs[round];
      const endX = rightXs[round + 1] + cardWidth;
      const midX = (startX + endX) / 2;
      addLine(startX, center, midX, center);
      addLine(midX, center, midX, targetCenter);
      addLine(midX, targetCenter, endX, targetCenter);
    });
  }

  const leftSemiCenter = leftRoundCenters[sideRounds - 1][0];
  const rightSemiCenter = rightRoundCenters[sideRounds - 1][0];
  const FINAL_VISUAL_OFFSET_Y = -6;
  const finalCenterAlignedY = (leftSemiCenter + rightSemiCenter) / 2;
  const finalAlignedY = finalCenterAlignedY - finalCardHeight / 2 + FINAL_VISUAL_OFFSET_Y;

  const glowLine = "#f59e0b";
  const leftStartX = leftXs[sideRounds - 1] + cardWidth;
  const leftEndX = finalX;
  addLine(leftStartX, leftSemiCenter, leftEndX, leftSemiCenter, glowLine, 2.1);

  const rightFinalStartX = rightXs[sideRounds - 1];
  const rightFinalEndX = finalX + finalWidth;
  addLine(rightFinalStartX, rightSemiCenter, rightFinalEndX, rightSemiCenter, glowLine, 2.1);

  return (
    <div className="min-w-0 w-full max-w-full">
      {zoomControls}
      <div ref={viewportRef} tabIndex={0} aria-label="Llave desplazable horizontalmente" className="sb-bracket-scroll w-full max-w-full overflow-x-scroll rounded-[22px] border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(255,247,237,0.58),_transparent_34%),linear-gradient(135deg,#fff_0%,#f8fafc_100%)] p-4 pb-5">
      <div className="mx-auto" style={{ width: totalWidth * scale * clampedScale, height: totalHeight * scale * clampedScale }}>
        <div
          className="relative"
          style={{
            width: totalWidth,
            height: totalHeight,
            transform: `scale(${scale * clampedScale})`,
            transformOrigin: "top left",
          }}
        >
          <svg className="absolute left-0 top-0" width={totalWidth} height={totalHeight} dangerouslySetInnerHTML={{ __html: svgLines.join("") }} />

          {Array.from({ length: sideRounds }, (_, round) => {
            const count = leftRoundCenters[round].length;
            return leftRoundCenters[round].map((center, index) => (
              <MatchNode
                key={`left-${round}-${index}`}
                match={getPositionMatch(round + 1, index + 1)}
                projectedTeams={getProjectedTeams(round + 1, index + 1)}
                label={getRoundTitle(bracketSize, round)}
                left={leftXs[round]}
                top={center - cardHeight / 2}
                width={cardWidth}
                onClick={getPositionMatch(round + 1, index + 1) ? () => onOpenMatch(getPositionMatch(round + 1, index + 1)!) : undefined}
              />
            )).concat(
              <div
                key={`left-title-${round}`}
                className="absolute text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"
                style={{ left: leftXs[round], top: 0, width: cardWidth }}
              >
                {getRoundTitle(bracketSize, round)}
              </div>,
            ).slice(0, count + 1);
          })}

          <div
            className="absolute text-center text-[11px] font-black uppercase tracking-[0.18em] text-orange-500"
            style={{ left: finalX, top: 0, width: finalWidth }}
          >
            Final
          </div>
          <div className="pointer-events-none absolute" style={{ left: finalX - 50, top: finalAlignedY - 54, width: finalWidth + 100, height: finalCardHeight + 120 }}>
            <div className="absolute left-1/2 top-[56px] h-[170px] w-[300px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(251,191,36,0.26)_0%,rgba(249,115,22,0.12)_45%,rgba(255,255,255,0)_72%)]" style={{ animation: "sbFinalHalo 3s ease-in-out infinite" }} />
            <div className="absolute left-1/2 top-[16px] flex items-center gap-2 -translate-x-1/2">
              <span className="h-px w-7 bg-gradient-to-r from-transparent to-amber-300/80" />
              <span style={{ filter: "drop-shadow(0 0 10px rgba(251,191,36,.75))", animation: "sbFinalCrown 2.6s ease-in-out infinite" }}><Trophy size={30} className="text-amber-400" /></span>
              <span className="h-px w-7 bg-gradient-to-l from-transparent to-amber-300/80" />
            </div>
            <span className="absolute left-[28px] top-[88px] h-1.5 w-1.5 rounded-full bg-amber-300/85" style={{ animation: "sbSpark 2s ease-in-out infinite .2s" }} />
            <span className="absolute right-[26px] top-[92px] h-1.5 w-1.5 rounded-full bg-orange-300/85" style={{ animation: "sbSpark 2s ease-in-out infinite .9s" }} />
            <span className="absolute left-[54px] bottom-[14px] h-1.5 w-1.5 rounded-full bg-amber-300/85" style={{ animation: "sbSpark 2s ease-in-out infinite 1.4s" }} />
            <span className="absolute right-[52px] bottom-[10px] h-1.5 w-1.5 rounded-full bg-orange-300/85" style={{ animation: "sbSpark 2s ease-in-out infinite .5s" }} />
          </div>
          <style>{`
            @keyframes sbFinalHalo {
              0%, 100% { opacity: .72; transform: translateX(-50%) scale(1); }
              50% { opacity: 1; transform: translateX(-50%) scale(1.1); }
            }
            @keyframes sbFinalCrown {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-3px) scale(1.06); }
            }
            @keyframes sbFinalBreath {
              0%, 100% { transform: scale(1); filter: drop-shadow(0 4px 10px rgba(249,115,22,.16)); }
              50% { transform: scale(1.018); filter: drop-shadow(0 8px 18px rgba(249,115,22,.28)); }
            }
            @keyframes sbSpark {
              0%, 100% { opacity: 0; transform: scale(.2); }
              40%, 60% { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <MatchNode match={getPositionMatch(Math.log2(bracketSize), 1)} projectedTeams={getProjectedTeams(Math.log2(bracketSize), 1)} label="Final" left={finalX} top={finalAlignedY} width={finalWidth} fixedHeight={finalCardHeight} onClick={getPositionMatch(Math.log2(bracketSize), 1) ? () => onOpenMatch(getPositionMatch(Math.log2(bracketSize), 1)!) : undefined} highlightFinal />

          {Array.from({ length: sideRounds }, (_, round) => {
            const count = rightRoundCenters[round].length;
            return rightRoundCenters[round].map((center, index) => (
              <MatchNode
                key={`right-${round}-${index}`}
                match={getPositionMatch(round + 1, (bracketSize / (2 ** (round + 2))) + index + 1)}
                projectedTeams={getProjectedTeams(round + 1, (bracketSize / (2 ** (round + 2))) + index + 1)}
                label={getRoundTitle(bracketSize, round)}
                left={rightXs[round]}
                top={center - cardHeight / 2}
                width={cardWidth}
                onClick={getPositionMatch(round + 1, (bracketSize / (2 ** (round + 2))) + index + 1) ? () => onOpenMatch(getPositionMatch(round + 1, (bracketSize / (2 ** (round + 2))) + index + 1)!) : undefined}
              />
            )).concat(
              <div
                key={`right-title-${round}`}
                className="absolute text-center text-[10px] font-black uppercase tracking-[0.16em] text-slate-400"
                style={{ left: rightXs[round], top: 0, width: cardWidth }}
              >
                {getRoundTitle(bracketSize, round)}
              </div>,
            ).slice(0, count + 1);
          })}
        </div>
      </div>
      </div>
    </div>
  );
}

function ManualBracketEditor({
  teams,
  orderedTeamIds,
  bracketSize,
  onSwapTeams,
  onReset,
}: {
  teams: ApiTeamOption[];
  orderedTeamIds: number[];
  bracketSize: number;
  onSwapTeams: (sourceTeamId: number, targetTeamId: number) => void;
  onReset: () => void;
}) {
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [draggedTeamId, setDraggedTeamId] = useState<number | null>(null);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const firstRoundSlots = useMemo(
    () => getBracketSeedOrder(bracketSize).map((seed) => orderedTeamIds[seed - 1] ?? null),
    [bracketSize, orderedTeamIds],
  );
  const pairings = useMemo(
    () => Array.from({ length: bracketSize / 2 }, (_, index) => ({
      number: index + 1,
      teamAId: firstRoundSlots[index * 2],
      teamBId: firstRoundSlots[index * 2 + 1],
    })),
    [bracketSize, firstRoundSlots],
  );
  const sideBreak = Math.ceil(pairings.length / 2);
  const firstRoundTitle = getRoundTitle(bracketSize, 0);

  const exchangeTeams = (sourceTeamId: number | null, targetTeamId: number) => {
    if (sourceTeamId !== null && sourceTeamId !== targetTeamId) {
      onSwapTeams(sourceTeamId, targetTeamId);
    }
    setSelectedTeamId(null);
    setDraggedTeamId(null);
  };

  const handleTeamClick = (teamId: number) => {
    if (selectedTeamId === null) {
      setSelectedTeamId(teamId);
      return;
    }
    if (selectedTeamId === teamId) {
      setSelectedTeamId(null);
      return;
    }
    exchangeTeams(selectedTeamId, teamId);
  };

  const renderTeamSlot = (teamId: number | null, position: "A" | "B") => {
    if (teamId === null) {
      return (
        <div className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-400">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[10px] font-black text-slate-400">{position}</span>
          Pase automatico
        </div>
      );
    }

    const team = teamById.get(teamId);
    const selected = selectedTeamId === teamId;
    const dragging = draggedTeamId === teamId;
    return (
      <button
        type="button"
        draggable
        aria-pressed={selected}
        onClick={() => handleTeamClick(teamId)}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("application/x-scoreblaze-team", String(teamId));
          event.dataTransfer.setData("text/plain", String(teamId));
          setDraggedTeamId(teamId);
          setSelectedTeamId(null);
        }}
        onDragEnd={() => setDraggedTeamId(null)}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const transferredValue = event.dataTransfer.getData("application/x-scoreblaze-team") || event.dataTransfer.getData("text/plain");
          const transferredTeamId = Number(transferredValue);
          exchangeTeams(Number.isInteger(transferredTeamId) && transferredTeamId > 0 ? transferredTeamId : draggedTeamId, teamId);
        }}
        className={`group flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${selected ? "bg-orange-50 ring-2 ring-orange-400" : dragging ? "bg-orange-50 opacity-50" : "bg-slate-50 hover:bg-sky-50"}`}
        title={selected ? "Seleccionado. Toca otro equipo para intercambiarlos." : "Arrastra este equipo o tocalo para seleccionarlo."}
      >
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${selected ? "bg-orange-500 text-white" : "bg-white text-slate-400"}`}>{position}</span>
        <TeamLogo
          name={team?.name ?? "Equipo"}
          logoBase64={team?.logo_base64 ?? null}
          seed={teamId}
          className="h-8 w-8 shrink-0 rounded-full bg-white text-[10px]"
          imageClassName="p-[1px]"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{team?.name ?? `Equipo ${teamId}`}</span>
        <GripVertical size={16} className="shrink-0 text-slate-300 transition group-hover:text-orange-400" />
      </button>
    );
  };

  const renderPairing = (pairing: (typeof pairings)[number]) => (
    <article key={pairing.number} className="rounded-[17px] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.07)] ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between px-2 pb-2 pt-1">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{firstRoundTitle} {pairing.number}</p>
        <span className="text-[9px] font-black uppercase tracking-[0.16em] text-orange-500">Cruce</span>
      </div>
      <div className="grid gap-1.5">
        {renderTeamSlot(pairing.teamAId, "A")}
        <div className="px-3 text-center text-[9px] font-black uppercase tracking-[0.16em] text-slate-300">vs</div>
        {renderTeamSlot(pairing.teamBId, "B")}
      </div>
    </article>
  );

  return (
    <div className="mt-4 rounded-[22px] bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_52%,#fff8f1_100%)] p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.13em] text-orange-600">Arma la primera ronda</p>
          <p className="mt-1 text-sm text-slate-600">
            Arrastra un equipo sobre otro para intercambiarlos. En celular, toca un equipo y despues su destino.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedTeamId(null);
            onReset();
          }}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:text-orange-600 hover:ring-orange-200"
        >
          <RotateCcw size={13} />
          Restablecer
        </button>
      </div>

      {selectedTeamId !== null ? (
        <div className="mb-3 rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">
          Equipo seleccionado. Toca la posicion con la que quieres intercambiarlo.
        </div>
      ) : null}

      <div className={`grid gap-5 ${pairings.length > 1 ? "lg:grid-cols-[minmax(0,1fr)_110px_minmax(0,1fr)]" : "mx-auto max-w-2xl"}`}>
        <div className="grid content-start gap-3">
          <p className="px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lado izquierdo</p>
          {pairings.slice(0, sideBreak).map(renderPairing)}
        </div>
        {pairings.length > 1 ? (
          <>
            <div className="relative hidden min-h-56 items-center justify-center lg:flex">
              <span className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-orange-200 via-orange-400 to-orange-200" />
              <div className="relative z-10 flex flex-col items-center bg-white/90 px-3 py-4 text-center shadow-[0_10px_30px_rgba(249,115,22,0.12)]">
                <Trophy size={22} className="text-orange-500" />
                <span className="mt-2 text-[9px] font-black uppercase tracking-[0.14em] text-orange-600">Ganadores avanzan</span>
              </div>
            </div>
            <div className="grid content-start gap-3">
              <p className="px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Lado derecho</p>
              {pairings.slice(sideBreak).map(renderPairing)}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function BracketLane({
  title,
  description,
  matches,
  tone,
  onOpenMatch,
}: {
  title: string;
  description: string;
  matches: QuickMatchListItem[];
  tone: "sky" | "orange" | "slate";
  onOpenMatch: (match: QuickMatchListItem) => void;
}) {
  const rounds = Array.from(new Set(matches.map((match) => match.bracketRound ?? 1))).sort((left, right) => left - right);
  const toneClasses = {
    sky: "border-sky-200 bg-[linear-gradient(135deg,#f0f9ff_0%,#ffffff_72%)] text-sky-700",
    orange: "border-orange-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_72%)] text-orange-700",
    slate: "border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_72%)] text-slate-700",
  } as const;

  return (
    <section className={`overflow-hidden rounded-[24px] border ${toneClasses[tone]}`}>
      <div className="flex flex-col gap-1 border-b border-current/10 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em]">{title}</p>
          <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
        </div>
        <span className="shrink-0 text-xs font-bold text-slate-400">{matches.length} {matches.length === 1 ? "cruce activo" : "cruces creados"}</span>
      </div>
      {matches.length > 0 ? (
        <div className="overflow-x-auto p-4">
          <div className="flex min-w-max items-start gap-4">
            {rounds.map((round) => {
              const roundMatches = matches.filter((match) => match.bracketRound === round);
              return (
                <div key={`${title}-${round}`} className="w-[238px] rounded-[18px] border border-white/80 bg-white/55 p-3 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                  <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                    {roundMatches[0]?.bracketPath === "GRAND_FINAL" ? roundMatches[0].tournament : `Ronda ${round}`}
                  </p>
                  <div className="grid gap-3">
                    {roundMatches.map((match) => (
                      <MatchNode
                        key={match.id}
                        match={match}
                        label={match.tournament || `Ronda ${round}`}
                        left={0}
                        top={0}
                        width={212}
                        absolute={false}
                        onClick={() => onOpenMatch(match)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="px-5 py-8 text-center text-sm font-medium text-slate-400">Los cruces apareceran cuando se resuelvan los partidos anteriores.</div>
      )}
    </section>
  );
}

function AdvancedBracketBoard({
  format,
  matches,
  onOpenMatch,
}: {
  format: "DOUBLE_ELIMINATION" | "PLAY_IN_PLUS_BRACKET";
  matches: QuickMatchListItem[];
  onOpenMatch: (match: QuickMatchListItem) => void;
}) {
  const byPath = (path: QuickMatchListItem["bracketPath"]) => matches.filter((match) => (match.bracketPath ?? "MAIN") === path);

  if (format === "PLAY_IN_PLUS_BRACKET") {
    return (
      <div className="grid gap-4">
        <div className="rounded-[20px] border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm leading-6 text-slate-600">
          El Play-In se resuelve primero. Sus ganadores ocupan los ultimos lugares de siembra y entonces se habilita la llave principal.
        </div>
        <BracketLane title="Play-In" description="Los equipos en zona de acceso compiten por los ultimos pases." matches={byPath("PLAY_IN")} tone="orange" onOpenMatch={onOpenMatch} />
        <BracketLane title="Llave principal" description="Aqui esperan los clasificados directos y avanzan los ganadores del Play-In." matches={byPath("MAIN")} tone="sky" onOpenMatch={onOpenMatch} />
        {byPath("THIRD_PLACE").length > 0 ? (
          <BracketLane title="Tercer lugar" description="Cruce entre los equipos que cayeron en semifinales." matches={byPath("THIRD_PLACE")} tone="slate" onOpenMatch={onOpenMatch} />
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[20px] border border-sky-100 bg-sky-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
        Cada equipo dispone de dos vidas. La primera derrota lo envia al carril de perdedores; la segunda lo elimina.
      </div>
      <BracketLane title="Carril de ganadores" description="Los invictos avanzan hacia la gran final." matches={byPath("WINNERS")} tone="sky" onOpenMatch={onOpenMatch} />
      <BracketLane title="Carril de perdedores" description="Una nueva derrota aqui elimina al equipo." matches={byPath("LOSERS")} tone="slate" onOpenMatch={onOpenMatch} />
      <BracketLane title="Gran final" description="Se habilita al definir a los campeones de ambos carriles." matches={byPath("GRAND_FINAL")} tone="orange" onOpenMatch={onOpenMatch} />
    </div>
  );
}

export default function LeagueBracketPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;
  const { league, matches, teams, loading, error } = useLeagueMatchesData(hasValidLeagueId ? selectedLeagueId : null);
  const { generatingBracket, resettingBracket, mutationErrorMessage, clearMutationError, generateBracketMatches, resetBracket } = useLeagueMatchesMutations();
  const [drawConfirmOpen, setDrawConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [seedMode, setSeedMode] = useState<"STANDINGS" | "RANDOM" | "MANUAL">("STANDINGS");
  const [manualTeamIds, setManualTeamIds] = useState<number[]>([]);
  const capabilities = league ? getCompetitionCapabilities(league) : null;
  const isDirectElimination = league?.competitionType === "ELIMINATION";
  const qualifiedTeamCount = league
    ? isDirectElimination ? teams.length : Math.min(league.finalPhaseQualifiedTeams, teams.length)
    : 0;
  const effectiveByes = league
    ? isDirectElimination && league.finalPhaseFormat === "SINGLE_ELIMINATION"
      ? Math.max(0, getBracketSize(qualifiedTeamCount) - qualifiedTeamCount)
      : isDirectElimination && league.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET"
        ? Math.max(0, qualifiedTeamCount - league.finalPhasePlayInSlots)
        : league.finalPhaseByes
    : 0;
  const configuredFirstRoundTeamCount = league
    ? (
      league.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET"
        ? league.finalPhasePlayInSlots
        : Math.max(0, qualifiedTeamCount * 2 - getBracketSize(qualifiedTeamCount))
    )
    : 0;
  const firstRoundTeamCount = Math.max(0, Math.min(configuredFirstRoundTeamCount, teams.length));
  const normalizedFirstRoundTeamCount = firstRoundTeamCount % 2 === 0 ? firstRoundTeamCount : firstRoundTeamCount - 1;
  const firstRoundMatchCount = Math.floor(normalizedFirstRoundTeamCount / 2);
  const firstRoundReferenceTeamCount = normalizedFirstRoundTeamCount > 0 ? normalizedFirstRoundTeamCount : qualifiedTeamCount;
  const firstRoundLabel = league?.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET" ? "Play-In" : getRoundLabel(firstRoundReferenceTeamCount);
  const bracketMatches = useMemo(() => getBracketMatches(matches), [matches]);
  const draftEliminationMatches = useMemo(
    () => matches
      .filter((match) => isDirectElimination && match.competitionStage === "FINAL_PHASE" && match.bracketRound === null)
      .sort((left, right) => left.id - right.id),
    [isDirectElimination, matches],
  );
  const draftTeamIds = draftEliminationMatches.flatMap((match) => [match.teamAId, match.teamBId]);
  const draftsHaveUniqueTeams = new Set(draftTeamIds).size === draftTeamIds.length;
  const draftsArePristine = draftEliminationMatches.every(
    (match) => match.status === "scheduled" && match.scoreTeamA === null && match.scoreTeamB === null && match.winnerTeamId === null,
  );
  const manualDraftsReady = draftEliminationMatches.length === firstRoundMatchCount && draftsHaveUniqueTeams && draftsArePristine;
  const standingsQuery = useQuery({
    queryKey: leaguesQueryKeys.stats(selectedLeagueId),
    queryFn: ({ signal }) => leaguesService.getLeagueStats(selectedLeagueId, signal),
    enabled: Boolean(league && capabilities?.showStandings && bracketMatches.length === 0),
  });
  const groupQualificationStandings = useMemo(() => {
    if (league?.competitionType !== "GROUPS" || !standingsQuery.data || !league.groupStageConfig) return undefined;
    return buildGroupQualificationOrder(
      standingsQuery.data.groupStandings,
      league.groupStageConfig.qualifiersPerGroup,
      league.groupStageConfig.bestExtraSlots,
      league.groupStageConfig.wildcardTiebreakers,
    );
  }, [league, standingsQuery.data]);
  const standings = league?.competitionType === "GROUPS" ? groupQualificationStandings : standingsQuery.data?.standings;
  const tableOrderedTeams = useMemo(() => orderTeamsByStandings(teams, standings), [standings, teams]);
  const qualifiedByTable = useMemo(
    () => tableOrderedTeams.slice(0, qualifiedTeamCount),
    [qualifiedTeamCount, tableOrderedTeams],
  );
  const manualAvailableTeamIds = useMemo(
    () => (league?.competitionType === "ELIMINATION" ? teams : qualifiedByTable).map((team) => team.id),
    [league?.competitionType, qualifiedByTable, teams],
  );
  const tableStandingByTeamId = useMemo(
    () => new Map((standings ?? []).map((row) => [row.teamId, row])),
    [standings],
  );
  const manualQualifiedTeamIds = manualTeamIds.slice(0, qualifiedTeamCount);
  const seedModeLabel = seedMode === "STANDINGS"
    ? league?.competitionType === "GROUPS" ? "por clasificacion de grupos" : "por tabla"
    : seedMode === "MANUAL" ? "con orden manual" : "de forma aleatoria";
  const standingsError = standingsQuery.error instanceof Error ? standingsQuery.error.message : null;
  const panelError = mutationErrorMessage ?? standingsError ?? error;

  useEffect(() => {
    setManualTeamIds((current) => {
      const retained = current.filter((teamId) => manualAvailableTeamIds.includes(teamId));
      const missing = manualAvailableTeamIds.filter((teamId) => !retained.includes(teamId));
      return [...retained, ...missing];
    });
  }, [manualAvailableTeamIds]);

  useEffect(() => {
    if (league?.competitionType === "LEAGUE") {
      setSeedMode(league.finalPhaseSeedMode);
    }
  }, [league?.competitionType, league?.finalPhaseSeedMode]);

  useEffect(() => {
    if (league && capabilities && !capabilities.showStandings && seedMode === "STANDINGS") {
      setSeedMode("RANDOM");
    }
  }, [capabilities, league, seedMode]);

  useEffect(() => {
    if (draftEliminationMatches.length > 0 && seedMode !== "MANUAL") {
      setSeedMode("MANUAL");
    }
  }, [draftEliminationMatches.length, seedMode]);

  const swapManualTeams = (sourceTeamId: number, targetTeamId: number) => {
    setManualTeamIds((current) => {
      const sourceIndex = current.indexOf(sourceTeamId);
      const targetIndex = current.indexOf(targetTeamId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      [next[sourceIndex], next[targetIndex]] = [next[targetIndex], next[sourceIndex]];
      return next;
    });
  };

  const regularSeasonAudit = useMemo(() => {
    if (!league) return { missingMatches: 0, unfinishedMatches: 0, duplicateMatches: 0 };
    if (league.competitionType === "LEAGUE") {
      return { ...summarizeLeagueSchedule(league.teamIds, league.regularSeasonFormat, matches), duplicateMatches: 0 };
    }
    if (league.competitionType === "GROUPS") {
      return summarizeGroupSchedule(league.groupStageConfig, league.regularSeasonFormat, matches);
    }
    return { missingMatches: 0, unfinishedMatches: 0, duplicateMatches: 0 };
  }, [league, matches]);

  const handleGenerateBracket = async () => {
    if (!league || teams.length < 2) {
      return;
    }

    try {
      let effectiveGroupQualification = groupQualificationStandings;
      let refreshedStats: Awaited<ReturnType<typeof leaguesService.getLeagueStats>> | undefined;
      if (league.competitionType === "GROUPS" && !effectiveGroupQualification && league.groupStageConfig) {
        refreshedStats = (await standingsQuery.refetch()).data;
        effectiveGroupQualification = buildGroupQualificationOrder(
          refreshedStats?.groupStandings ?? [],
          league.groupStageConfig.qualifiersPerGroup,
          league.groupStageConfig.bestExtraSlots,
          league.groupStageConfig.wildcardTiebreakers,
        );
      }
      let resolvedStandings = seedMode === "STANDINGS"
        ? league.competitionType === "GROUPS" ? effectiveGroupQualification : standings
        : undefined;
      if (seedMode === "STANDINGS" && !resolvedStandings) {
        refreshedStats = (await standingsQuery.refetch()).data;
        resolvedStandings = league.competitionType === "GROUPS" && league.groupStageConfig
          ? buildGroupQualificationOrder(
              refreshedStats?.groupStandings ?? [],
              league.groupStageConfig.qualifiersPerGroup,
              league.groupStageConfig.bestExtraSlots,
              league.groupStageConfig.wildcardTiebreakers,
            )
          : refreshedStats?.standings;
      }
      const leagueQualifiedTeams = league.competitionType === "LEAGUE"
        ? orderTeamsByStandings(teams, resolvedStandings).slice(0, qualifiedTeamCount)
        : [];
      const groupQualifiedTeams = league.competitionType === "GROUPS"
        ? orderTeamsByStandings(teams, effectiveGroupQualification).slice(0, qualifiedTeamCount)
        : league.competitionType === "LEAGUE" ? leagueQualifiedTeams : teams;
      const orderedTeams = seedMode === "MANUAL"
        ? [
            ...manualTeamIds
              .map((teamId) => groupQualifiedTeams.find((team) => team.id === teamId) ?? null)
              .filter((team): team is (typeof teams)[number] => team !== null),
            ...groupQualifiedTeams.filter((team) => !manualTeamIds.includes(team.id)),
          ]
        : groupQualifiedTeams;
      await generateBracketMatches({
        leagueId: league.id,
        format: league.finalPhaseFormat,
        qualifiedTeams: qualifiedTeamCount,
        byes: effectiveByes,
        playInSlots: league.finalPhasePlayInSlots,
        teams: orderedTeams,
        trackedStats: league.trackedStats,
        seedMode,
        standings: resolvedStandings,
        confirmIncompleteRegularSeason: regularSeasonAudit.missingMatches > 0 || regularSeasonAudit.unfinishedMatches > 0,
      });
      setDrawConfirmOpen(false);
    } catch {
      return;
    }
  };

  const handleDeleteAllMatches = async () => {
    if (!league || matches.length === 0) {
      return;
    }

    try {
      await resetBracket(league.id);
      setDeleteAllConfirmOpen(false);
    } catch {
      return;
    }
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1380px]">
        <PageHeader
          title="Llaves"
          subtitle="Visualiza los cruces de eliminacion y sortea la primera ronda."
          actions={<LeagueSectionNav league={league} active="bracket" />}
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {!loading && !hasValidLeagueId ? (
            <TableEmptyState
              mode="filtered"
              title="Competencia no encontrada"
              description="El enlace de esta competencia es invalido o ya no esta disponible."
              actionLabel="Volver"
              onAction={() => navigate("/leagues")}
            />
          ) : null}

          {!loading && hasValidLeagueId && !league ? (
            <TableEmptyState
              mode="filtered"
              title="Competencia no encontrada"
              description="No encontramos la competencia que intentaste abrir."
              actionLabel="Volver"
              onAction={() => navigate("/leagues")}
            />
          ) : null}

          {league && capabilities && !capabilities.showBracket ? (
            <TableEmptyState
              mode="filtered"
              title="Esta competencia no usa llaves"
              description={`${capabilities.label} no necesita vista de eliminacion.`}
              actionLabel="Volver al dashboard"
              onAction={() => navigate(`/leagues/${league.id}`)}
            />
          ) : null}

          {league && capabilities?.showBracket ? (
            <>
              <section className="mb-4 rounded-[28px] border border-slate-300 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">Vista de llaves</p>
                    <h2 className="mt-2 max-w-full truncate text-[30px] leading-none text-slate-950 sm:text-[34px]" title={league.name}>
                      {league.name}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <UsersRound size={14} />
                      {teams.length} equipos
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <CalendarDays size={14} />
                      {matches.length} partidos
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <Shield size={14} />
                      {league.category}
                    </span>
                    <StatusBadge status={league.status} />
                    <Button
                      variant="danger"
                      onClick={() => {
                        clearMutationError();
                        setDeleteAllConfirmOpen(true);
                      }}
                      disabled={bracketMatches.length === 0 || generatingBracket || resettingBracket}
                      title="Elimina solamente los partidos de la llave para volver a sortear desde cero."
                    >
                      <Trash2 size={15} />
                      {resettingBracket ? "Reiniciando..." : "Reiniciar llave"}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        clearMutationError();
                        setDrawConfirmOpen(true);
                      }}
                       disabled={teams.length < 2 || firstRoundMatchCount === 0 || regularSeasonAudit.duplicateMatches > 0 || standingsQuery.isFetching || generatingBracket || resettingBracket || bracketMatches.length > 0 || (draftEliminationMatches.length > 0 && !manualDraftsReady)}
                      title={
                         bracketMatches.length > 0
                           ? "Ya hay cruces sorteados; elimina los partidos si necesitas sortear de nuevo."
                           : draftEliminationMatches.length > 0 && !manualDraftsReady
                             ? `Define exactamente ${firstRoundMatchCount} cruces validos antes de cerrar la llave.`
                          : firstRoundMatchCount === 0
                            ? "Esta configuracion no tiene suficientes equipos para abrir la primera ronda."
                            : "Sortea automaticamente los equipos y crea los partidos de la primera ronda."
                      }
                    >
                       {draftEliminationMatches.length > 0 ? <Check size={15} /> : <Shuffle size={15} />}
                       {generatingBracket ? "Generando..." : draftEliminationMatches.length > 0 ? "Listo, cerrar llave" : "Generar llave"}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="min-w-0 max-w-full bg-white px-1 py-4 sm:px-2">
                {bracketMatches.length === 0 ? (
                  <div className="mb-5 overflow-hidden rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_52%,#fff8f1_100%)]">
                    <div className="flex flex-col gap-4 border-b border-slate-200/80 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.13em] text-orange-600">
                          {isDirectElimination ? "Participantes de la llave" : "Clasificacion a playoffs"}
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-slate-950">
                          {isDirectElimination ? `Participan los ${teams.length} equipos inscritos` : `Clasifican ${qualifiedTeamCount} de ${teams.length} equipos`}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {isDirectElimination ? "Elige el orden de siembra; ningun equipo queda fuera." : "Elige quienes avanzan y en que orden entran a la llave."}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => navigate(
                            league.competitionType === "GROUPS"
                              ? `/leagues/${league.id}/groups`
                              : `/leagues/${league.id}/final-phase/settings`,
                          )}
                          disabled={generatingBracket || resettingBracket}
                        >
                          {league.competitionType === "GROUPS" ? "Ajustar grupos" : isDirectElimination ? "Ajustar formato" : "Ajustar cupos"}
                        </Button>
                        <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-bold text-orange-700">
                          {league.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET"
                            ? `${effectiveByes} participantes directos`
                            : effectiveByes > 0 ? `${effectiveByes} con pase automatico` : "Sin pases automaticos"}
                        </span>
                      </div>
                    </div>

                     <div className="p-5">
                       {draftEliminationMatches.length > 0 ? (
                         <div className={`mb-4 rounded-[18px] border px-4 py-4 ${manualDraftsReady ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"}`}>
                           <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                             <div>
                               <p className={`text-sm font-bold ${manualDraftsReady ? "text-emerald-900" : "text-amber-900"}`}>
                                 {draftEliminationMatches.length}/{firstRoundMatchCount} cruces manuales definidos
                               </p>
                               <p className="mt-1 text-xs leading-5 text-slate-600">
                                 {manualDraftsReady
                                   ? "Todo esta listo. Revisa los enfrentamientos y cierra la llave cuando estes conforme."
                                   : "Cada equipo debe aparecer una sola vez y todos los cruces deben seguir programados, sin marcador."}
                               </p>
                             </div>
                             <Button type="button" variant="outline" onClick={() => navigate(`/leagues/${league.id}/matches`)}>
                               Editar cruces
                             </Button>
                           </div>
                           <div className="mt-3 grid gap-2 sm:grid-cols-2">
                             {draftEliminationMatches.map((match, index) => (
                               <div key={match.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/80 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                                 <span className="shrink-0 text-xs font-black text-orange-600">{index + 1}</span>
                                 <span className="min-w-0 flex-1 truncate">{match.teamAName}</span>
                                 <span className="shrink-0 text-xs text-slate-400">vs</span>
                                 <span className="min-w-0 flex-1 truncate text-right">{match.teamBName}</span>
                               </div>
                             ))}
                           </div>
                         </div>
                       ) : null}
                       {league.competitionType === "LEAGUE" ? (
                        <div className="flex flex-col gap-3 rounded-[18px] border border-sky-200 bg-sky-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-bold text-sky-900">
                              {seedMode === "STANDINGS" ? <ListOrdered size={16} /> : seedMode === "RANDOM" ? <Dices size={16} /> : <Shuffle size={16} />}
                              {seedMode === "STANDINGS" ? "Mejor contra peor" : seedMode === "RANDOM" ? "Sorteo entre clasificados" : "Orden manual"}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-sky-800">El Top {qualifiedTeamCount} ya esta definido por la tabla; este metodo solamente acomoda sus cruces.</p>
                          </div>
                          <Button type="button" variant="outline" onClick={() => navigate(
                            league.competitionType === "GROUPS"
                              ? `/leagues/${league.id}/groups`
                              : `/leagues/${league.id}/final-phase/settings`,
                          )}>
                            Cambiar en ajustes
                          </Button>
                        </div>
                      ) : (
                        <div className={`grid gap-2 ${capabilities.showStandings ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                          {([
                            ...(capabilities.showStandings
                              ? [["STANDINGS", league.competitionType === "GROUPS" ? "Por grupos" : "Por tabla", league.competitionType === "GROUPS" ? "Respeta clasificados y mejores extras" : "Respeta la clasificacion actual", ListOrdered] as const]
                              : []),
                            ["RANDOM", "Aleatorio", isDirectElimination ? "Sortea participantes y posiciones" : "Sortea clasificados y posiciones", Dices],
                            ["MANUAL", "Manual", isDirectElimination ? "Arrastra equipos dentro de la llave" : "Acomoda los cruces visualmente", Shuffle],
                          ] as const).map(([mode, label, description, Icon]) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => setSeedMode(mode)}
                              disabled={draftEliminationMatches.length > 0}
                              className={`rounded-[17px] border px-4 py-3 text-left transition ${seedMode === mode ? "border-orange-300 bg-orange-50 text-orange-800 shadow-[0_10px_24px_rgba(249,115,22,0.10)]" : "border-slate-200 bg-white text-slate-600 hover:border-sky-200 hover:bg-sky-50/50"}`}
                            >
                              <span className="flex items-center gap-2 text-sm font-bold"><Icon size={15} />{label}</span>
                              <span className="mt-1 block text-xs font-medium opacity-75">{description}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {seedMode === "STANDINGS" ? (
                        <div className="mt-4">
                          <p className="rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2 text-xs font-medium text-sky-800">
                            {league.competitionType === "GROUPS"
                              ? "Primero avanzan los puestos fijos de cada grupo y despues los mejores extras. La siembra cruza primero contra ultimo."
                              : "El mejor clasificado se cruza con el ultimo sembrado, el segundo con el penultimo y asi sucesivamente."}
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {tableOrderedTeams.slice(0, qualifiedTeamCount).map((team, index) => {
                              const standing = tableStandingByTeamId.get(team.id);
                              return (
                                <div key={team.id} className="flex items-center gap-3 rounded-[15px] border border-slate-200 bg-white px-3 py-2.5">
                                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-xs font-black text-sky-700">{index + 1}</span>
                                  <TeamLogo name={team.name} logoBase64={team.logo_base64} seed={team.id} className="h-8 w-8 shrink-0 rounded-full text-[10px]" />
                                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{team.name}</span>
                                  <span className="text-[10px] font-bold text-slate-400">{standing ? `${standing.standingsPoints} pts` : "Sin juegos"}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {seedMode === "RANDOM" ? (
                        <div className="mt-4 rounded-[18px] border border-orange-100 bg-orange-50/60 px-4 py-4">
                          <p className="text-sm font-bold text-slate-900">Se sortearan las posiciones de los {qualifiedTeamCount} {isDirectElimination ? "participantes" : "equipos clasificados"}.</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {isDirectElimination
                              ? "El sorteo definira todas las posiciones. Cada equipo aparecera una sola vez y todos comenzaran en la misma ronda."
                              : "El sorteo tambien definira las posiciones de siembra. Ningun equipo se repetira y los byes respetaran ese orden."}
                          </p>
                        </div>
                      ) : null}

                    </div>
                  </div>
                ) : null}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Fase de eliminacion</p>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-950">{firstRoundLabel}</h3>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-3 py-1.5 text-xs font-semibold text-orange-600">
                    <Trophy size={13} />
                    {capabilities.label}
                  </span>
                </div>

                {bracketMatches.length > 0 ? (
                  league.finalPhaseFormat === "SINGLE_ELIMINATION" ? (
                    <div className="grid gap-4">
                      <BracketCanvas
                        matches={bracketMatches.filter((match) => (match.bracketPath ?? "MAIN") === "MAIN")}
                        qualifiedTeams={qualifiedTeamCount}
                        reseedEachRound={league.finalPhaseReseedEachRound}
                        onOpenMatch={(match) => navigate(`/leagues/${league.id}/matches/${match.id}/stats`)}
                      />
                      {bracketMatches.some((match) => match.bracketPath === "THIRD_PLACE") ? (
                        <BracketLane
                          title="Tercer lugar"
                          description="Cruce entre los equipos que cayeron en semifinales."
                          matches={bracketMatches.filter((match) => match.bracketPath === "THIRD_PLACE")}
                          tone="slate"
                          onOpenMatch={(match) => navigate(`/leagues/${league.id}/matches/${match.id}/stats`)}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <AdvancedBracketBoard
                      format={league.finalPhaseFormat}
                      matches={bracketMatches}
                      onOpenMatch={(match) => navigate(`/leagues/${league.id}/matches/${match.id}/stats`)}
                    />
                  )
                ) : seedMode === "MANUAL" && draftEliminationMatches.length === 0 ? (
                  <ManualBracketEditor
                    teams={teams}
                    orderedTeamIds={manualQualifiedTeamIds}
                    bracketSize={getBracketSize(qualifiedTeamCount)}
                    onSwapTeams={swapManualTeams}
                    onReset={() => setManualTeamIds(manualAvailableTeamIds)}
                  />
                ) : (
                  <div className="rounded-[26px] border border-dashed border-slate-300 bg-white/75 px-5 py-16 text-center">
                    <Trophy className="mx-auto text-orange-500" size={30} />
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">Aun no hay llaves creadas</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                      {isDirectElimination ? "Ordena los participantes y genera los cruces iniciales." : "Configura los clasificados y genera los cruces iniciales con el orden elegido."}
                    </p>
                  </div>
                )}
              </section>
            </>
          ) : null}
        </Panel>
      </div>

      <ConfirmModal
        isOpen={drawConfirmOpen}
         title={draftEliminationMatches.length > 0 ? "Cerrar llave" : "Generar llave"}
        message={
           draftEliminationMatches.length > 0
             ? manualDraftsReady
               ? `Se conservaran los ${draftEliminationMatches.length} cruces manuales y se completara la estructura del torneo. Despues ya no podras crear, borrar ni cambiar participantes; solo reprogramar partidos y registrar resultados.`
               : `Necesitas exactamente ${firstRoundMatchCount} cruces programados, sin marcadores ni equipos repetidos.`
             : firstRoundMatchCount > 0
            ? `${league?.competitionType === "LEAGUE"
              ? regularSeasonAudit.missingMatches > 0 || regularSeasonAudit.unfinishedMatches > 0
                ? `La fase regular aun tiene ${regularSeasonAudit.missingMatches} cruce(s) por crear y ${regularSeasonAudit.unfinishedMatches} partido(s) sin finalizar. Al continuar, esos encuentros ya no podran jugarse ni modificar la tabla. `
                : "La temporada regular esta completa. Al continuar, la tabla quedara congelada. "
              : league?.competitionType === "GROUPS"
                ? regularSeasonAudit.duplicateMatches > 0
                  ? `Hay ${regularSeasonAudit.duplicateMatches} partido(s) excedente(s). Eliminalos antes de generar la llave. `
                  : regularSeasonAudit.missingMatches > 0 || regularSeasonAudit.unfinishedMatches > 0
                    ? `Los grupos aun tienen ${regularSeasonAudit.missingMatches} cruce(s) por crear y ${regularSeasonAudit.unfinishedMatches} partido(s) sin finalizar. Al continuar, las tablas quedaran congeladas. `
                    : "La fase de grupos esta completa. Al continuar, sus tablas quedaran congeladas. "
              : ""}${league?.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET"
              ? `${isDirectElimination ? "Participaran" : "Avanzaran"} ${qualifiedTeamCount} equipos ${seedModeLabel}. Se abriran ${firstRoundMatchCount} cruces de Play-In.`
              : league?.finalPhaseFormat === "DOUBLE_ELIMINATION"
                ? `${isDirectElimination ? "Participaran" : "Avanzaran"} ${qualifiedTeamCount} equipos ${seedModeLabel}. Se abriran ${firstRoundMatchCount} cruces en ganadores.`
                : `${isDirectElimination ? "Participaran" : "Avanzaran"} ${qualifiedTeamCount} equipos ${seedModeLabel}. Se crearan ${firstRoundMatchCount} ${firstRoundMatchCount === 1 ? "partido" : "partidos"} de ${firstRoundLabel.toLowerCase()}.`}`
            : "Necesitas al menos 2 equipos para generar una llave."
        }
        loading={generatingBracket || resettingBracket}
         confirmText={draftEliminationMatches.length > 0 ? "Listo, cerrar llave" : "Generar llave"}
        confirmVariant="primary"
        loadingText="Generando..."
        onCancel={() => {
          clearMutationError();
          setDrawConfirmOpen(false);
        }}
        onConfirm={handleGenerateBracket}
      />

      <ConfirmModal
        isOpen={deleteAllConfirmOpen}
        title="Reiniciar llave"
        message={
            bracketMatches.length > 0
               ? `Se eliminaran ${bracketMatches.length} ${bracketMatches.length === 1 ? "partido" : "partidos"} de la llave${bracketMatches.some((match) => match.status === "finished") ? ", incluidos resultados ya finalizados" : ""}.${isDirectElimination ? " Podras volver a definir los cruces iniciales desde cero." : " Los partidos de temporada regular se conservaran y la tabla volvera a quedar abierta."}`
              : "No hay una llave para reiniciar."
        }
        loading={resettingBracket}
        confirmText="Reiniciar llave"
        confirmVariant="danger"
        loadingText="Eliminando..."
        onCancel={() => {
          clearMutationError();
          setDeleteAllConfirmOpen(false);
        }}
        onConfirm={handleDeleteAllMatches}
      />
    </div>
  );
}

