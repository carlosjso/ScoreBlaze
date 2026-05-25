import { CalendarDays, Minus, RotateCcw, Shuffle, Shield, Trash2, Trophy, UsersRound, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { getCompetitionCapabilities } from "@/features/leagues/competitionCapabilities";
import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { useLeagueMatchesMutations } from "@/features/leagues/hooks/useLeagueMatchesMutations";
import type { QuickMatchListItem } from "@/features/quick-matches/QuickMatches.types";
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

function getRoundSeedName(teamCount: number) {
  if (teamCount <= 2) return "Final";
  if (teamCount <= 4) return "Semifinal";
  if (teamCount <= 8) return "Cuartos de final";
  if (teamCount <= 16) return "Octavos de final";
  return "Ronda inicial";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getUniqueRoundMatches(matches: QuickMatchListItem[], expectedCount: number, roundSeedName: string) {
  if (expectedCount <= 0) {
    return [];
  }

  const normalizedRoundSeed = normalizeText(roundSeedName);
  const roundCandidates = matches.filter((match) => {
    const tournamentLabel = normalizeText(match.tournament ?? "");
    return tournamentLabel.includes(normalizedRoundSeed);
  });

  const pickUniqueMatches = (source: QuickMatchListItem[]) => {
    const selected: QuickMatchListItem[] = [];
    const usedTeamIds = new Set<number>();

    for (const match of source) {
      if (selected.length >= expectedCount) break;
      if (match.teamAId === match.teamBId) continue;
      if (usedTeamIds.has(match.teamAId) || usedTeamIds.has(match.teamBId)) continue;

      usedTeamIds.add(match.teamAId);
      usedTeamIds.add(match.teamBId);
      selected.push(match);
    }

    return selected;
  };

  const fromRoundCandidates = pickUniqueMatches(roundCandidates);
  if (fromRoundCandidates.length >= expectedCount) {
    return fromRoundCandidates;
  }

  const fallbackMatches = pickUniqueMatches(matches);
  return fallbackMatches.slice(0, expectedCount);
}

function getBracketSize(teamCount: number) {
  return Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, teamCount))));
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

function MatchNode({
  match,
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
    : [
        { id: 0, name: "Por definir", logo: null, score: "-", winner: false },
        { id: 0, name: "Por definir", logo: null, score: "-", winner: false },
      ];

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
  onOpenMatch,
}: {
  matches: QuickMatchListItem[];
  qualifiedTeams: number;
  onOpenMatch: (match: QuickMatchListItem) => void;
}) {
  const [viewScale, setViewScale] = useState(1);
  const MIN_VIEW_SCALE = 0.75;
  const MAX_VIEW_SCALE = 1.35;
  const STEP_VIEW_SCALE = 0.1;
  const clampedScale = Math.min(Math.max(viewScale, MIN_VIEW_SCALE), MAX_VIEW_SCALE);

  const zoomControls = (
    <div className="mb-3 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => setViewScale((current) => Math.max(MIN_VIEW_SCALE, current - STEP_VIEW_SCALE))}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
        title="Alejar"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[54px] text-center text-xs font-semibold text-slate-500">{Math.round(clampedScale * 100)}%</span>
      <button
        type="button"
        onClick={() => setViewScale((current) => Math.min(MAX_VIEW_SCALE, current + STEP_VIEW_SCALE))}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
        title="Acercar"
      >
        <Plus size={14} />
      </button>
      <button
        type="button"
        onClick={() => setViewScale(1)}
        className="inline-flex h-8 items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
        title="Restablecer zoom"
      >
        <RotateCcw size={12} />
        Reset
      </button>
    </div>
  );

  const resolveWinner = (match?: QuickMatchListItem) => {
    if (!match) return { name: "Por definir", logo: null as string | null, seed: 0 };
    if (match.winnerTeamId === match.teamAId) return { name: match.teamAName, logo: match.teamALogoBase64, seed: match.teamAId };
    if (match.winnerTeamId === match.teamBId) return { name: match.teamBName, logo: match.teamBLogoBase64, seed: match.teamBId };
    return { name: "Por definir", logo: null as string | null, seed: 0 };
  };

  const bracketSize = getBracketSize(qualifiedTeams);
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

  const leftMatches = matches.slice(0, firstRoundPerSide);
  const rightMatches = matches.slice(firstRoundPerSide, firstRoundPerSide * 2);
  const svgLines: string[] = [];

  if (false && bracketSize === 4) {
    const semiA = matches[0];
    const semiB = matches[1];
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
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_44%,#f8fafc_100%)] p-6">
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

  if (false && bracketSize === 8) {
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
    const yFinal = 95;
    const qf1 = matches[0];
    const qf2 = matches[1];
    const qf3 = matches[2];
    const qf4 = matches[3];
    const semiA = matches[4];
    const semiB = matches[5];
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

    const SemiSlot = ({ title, match }: { title: string; match?: QuickMatchListItem }) => (
      <button type="button" disabled={!match} onClick={match ? () => onOpenMatch(match) : undefined} className={`${sideCardClass} min-h-[116px] w-[220px]`}>
        <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{title}</div>
        <div className="p-2.5 space-y-2">
          {[0, 1].map((rowIndex) => {
            const isA = rowIndex === 0;
            const name = isA ? match?.teamAName : match?.teamBName;
            const logo = isA ? match?.teamALogoBase64 : match?.teamBLogoBase64;
            const seed = isA ? match?.teamAId : match?.teamBId;
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
      <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_44%,#f8fafc_100%)] p-4">
        {zoomControls}
        <div className="overflow-auto rounded-[22px] border border-slate-200 bg-white/70 p-4">
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
                <div className="absolute left-[300px] top-[115px]"><SemiSlot title="Semifinal 1" match={semiA} /></div>

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

                <div className="absolute left-[800px] top-[115px]"><SemiSlot title="Semifinal 2" match={semiB} /></div>
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
    <div className="rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_center,_rgba(255,247,237,0.58),_transparent_34%),linear-gradient(135deg,#fff_0%,#f8fafc_100%)] p-4">
      {zoomControls}
      <div className="overflow-auto rounded-[22px] border border-slate-200 bg-white/70 p-4">
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
                match={round === 0 ? leftMatches[index] : undefined}
                label={getRoundTitle(bracketSize, round)}
                left={leftXs[round]}
                top={center - cardHeight / 2}
                width={cardWidth}
                onClick={leftMatches[index] ? () => onOpenMatch(leftMatches[index]) : undefined}
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
          <MatchNode label="Final" left={finalX} top={finalAlignedY} width={finalWidth} fixedHeight={finalCardHeight} highlightFinal />

          {Array.from({ length: sideRounds }, (_, round) => {
            const count = rightRoundCenters[round].length;
            return rightRoundCenters[round].map((center, index) => (
              <MatchNode
                key={`right-${round}-${index}`}
                match={round === 0 ? rightMatches[index] : undefined}
                label={getRoundTitle(bracketSize, round)}
                left={rightXs[round]}
                top={center - cardHeight / 2}
                width={cardWidth}
                onClick={rightMatches[index] ? () => onOpenMatch(rightMatches[index]) : undefined}
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

export default function LeagueBracketPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;
  const { league, matches, teams, loading, error } = useLeagueMatchesData(hasValidLeagueId ? selectedLeagueId : null);
  const { generatingBracket, deletingAllMatches, mutationErrorMessage, clearMutationError, generateBracketMatches, deleteAllLeagueMatches } = useLeagueMatchesMutations();
  const [drawConfirmOpen, setDrawConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const capabilities = league ? getCompetitionCapabilities(league) : null;
  const qualifiedTeamCount = league ? Math.min(league.finalPhaseQualifiedTeams, teams.length) : 0;
  const configuredFirstRoundTeamCount = league
    ? (
      league.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET"
        ? league.finalPhasePlayInSlots
        : league.finalPhaseQualifiedTeams - league.finalPhaseByes
    )
    : 0;
  const firstRoundTeamCount = Math.max(0, Math.min(configuredFirstRoundTeamCount, teams.length));
  const normalizedFirstRoundTeamCount = firstRoundTeamCount % 2 === 0 ? firstRoundTeamCount : firstRoundTeamCount - 1;
  const firstRoundMatchCount = Math.floor(normalizedFirstRoundTeamCount / 2);
  const firstRoundReferenceTeamCount = normalizedFirstRoundTeamCount > 0 ? normalizedFirstRoundTeamCount : qualifiedTeamCount;
  const firstRoundLabel = league?.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET" ? "Play-In" : getRoundLabel(firstRoundReferenceTeamCount);
  const firstRoundSeedName = league?.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET" ? "Play-In" : getRoundSeedName(firstRoundReferenceTeamCount);
  const bracketRoundMatches = useMemo(
    () => getUniqueRoundMatches(matches, firstRoundMatchCount, firstRoundSeedName),
    [firstRoundMatchCount, firstRoundSeedName, matches],
  );
  const panelError = mutationErrorMessage ?? error;

  const handleGenerateBracket = async () => {
    if (!league || teams.length < 2) {
      return;
    }

    try {
      await generateBracketMatches({
        leagueId: league.id,
        format: league.finalPhaseFormat,
        qualifiedTeams: league.finalPhaseQualifiedTeams,
        byes: league.finalPhaseByes,
        playInSlots: league.finalPhasePlayInSlots,
        teams,
        trackedStats: league.trackedStats,
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
      await deleteAllLeagueMatches(
        league.id,
        matches.map((match) => match.id),
      );
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
                      disabled={matches.length === 0 || generatingBracket || deletingAllMatches}
                      title="Elimina todos los partidos de esta competencia para volver a sortear desde cero."
                    >
                      <Trash2 size={15} />
                      {deletingAllMatches ? "Eliminando..." : "Eliminar partidos"}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        clearMutationError();
                        setDrawConfirmOpen(true);
                      }}
                      disabled={teams.length < 2 || firstRoundMatchCount === 0 || generatingBracket || deletingAllMatches || bracketRoundMatches.length > 0}
                      title={
                        bracketRoundMatches.length > 0
                          ? "Ya hay cruces sorteados; elimina los partidos si necesitas sortear de nuevo."
                          : firstRoundMatchCount === 0
                            ? "Esta configuracion no tiene suficientes equipos para abrir la primera ronda."
                            : "Sortea automaticamente los equipos y crea los partidos de la primera ronda."
                      }
                    >
                      <Shuffle size={15} />
                      {generatingBracket ? "Sorteando..." : "Sortear llaves"}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-[30px] border border-slate-300 bg-white p-5 shadow-sm">
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

                {bracketRoundMatches.length > 0 ? (
                  <BracketCanvas
                    matches={bracketRoundMatches}
                    qualifiedTeams={normalizedFirstRoundTeamCount || league.finalPhaseQualifiedTeams}
                    onOpenMatch={(match) => navigate(`/leagues/${league.id}/matches/${match.id}/stats`)}
                  />
                ) : (
                  <div className="rounded-[26px] border border-dashed border-slate-300 bg-white/75 px-5 py-16 text-center">
                    <Trophy className="mx-auto text-orange-500" size={30} />
                    <h3 className="mt-3 text-xl font-semibold text-slate-950">Aun no hay llaves creadas</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                      Usa el boton de sorteo para crear los cruces iniciales con los equipos inscritos.
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
        title="Sortear llaves"
        message={
          firstRoundMatchCount > 0
            ? `Se crearan ${firstRoundMatchCount} ${firstRoundMatchCount === 1 ? "partido" : "partidos"} de ${firstRoundLabel.toLowerCase()} con ${normalizedFirstRoundTeamCount} equipos en primera ronda.`
            : "Necesitas al menos 2 equipos para sortear una llave."
        }
        loading={generatingBracket || deletingAllMatches}
        confirmText="Sortear"
        confirmVariant="primary"
        loadingText="Sorteando..."
        onCancel={() => {
          clearMutationError();
          setDrawConfirmOpen(false);
        }}
        onConfirm={handleGenerateBracket}
      />

      <ConfirmModal
        isOpen={deleteAllConfirmOpen}
        title="Eliminar todos los partidos"
        message={
          matches.length > 0
            ? `Se eliminaran ${matches.length} ${matches.length === 1 ? "partido" : "partidos"} de esta competencia. Esta accion no se puede deshacer.`
            : "No hay partidos para eliminar."
        }
        loading={deletingAllMatches}
        confirmText="Eliminar todo"
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

