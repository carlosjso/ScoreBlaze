import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import {
  getQuickMatchStatsSnapshot,
  type QuickMatchStatsEvent,
  type QuickMatchStatsEventType,
  type QuickMatchStatsSnapshot,
  type QuickMatchStatsTeamSnapshot,
} from "@/features/quick-matches/QuickMatchStats.service";
import {
  formatMatchDate,
  formatMatchTimeRange,
  getMatchResultLabel,
  getMatchStatusLabel,
} from "@/features/quick-matches/QuickMatches.types";
import { getTeamLogoSrc } from "@/features/teams/Teams.utils";

type PlayerReport = {
  key: string;
  label: string;
  shirtNumber: string | null;
  points: number;
  made1: number;
  made2: number;
  made3: number;
  misses: number;
  assists: number;
  rebounds: number;
  fouls: number;
  actions: number;
  madeShots: number;
  shotAttempts: number;
  accuracy: number;
};

type TeamReport = {
  id: number;
  name: string;
  logo: string | null;
  score: number;
  players: PlayerReport[];
  totals: Omit<PlayerReport, "key" | "label" | "shirtNumber"> & {
    pointsPerAction: number;
  };
};

type MatchReport = {
  snapshot: QuickMatchStatsSnapshot;
  activeEvents: QuickMatchStatsEvent[];
  teamA: TeamReport;
  teamB: TeamReport;
  resultLabel: string;
  periods: Array<{ label: string; teamA: number; teamB: number }>;
  insights: {
    leadChanges: number;
    ties: number;
    largestLeadA: number;
    largestLeadB: number;
  };
};

type PdfWithTable = jsPDF & {
  lastAutoTable?: { finalY: number };
};

type RgbColor = [number, number, number];

const COLORS: Record<string, RgbColor> = {
  ink: [15, 23, 42],
  slate: [71, 85, 105],
  muted: [148, 163, 184],
  line: [226, 232, 240],
  paper: [248, 250, 252],
  orange: [249, 115, 22],
  orangeSoft: [255, 247, 237],
  navy: [12, 20, 38],
  white: [255, 255, 255],
};

const EVENT_POINTS: Partial<Record<QuickMatchStatsEventType, number>> = {
  point_1: 1,
  point_2: 2,
  point_3: 3,
};

function getEventPoints(eventType: QuickMatchStatsEventType) {
  return EVENT_POINTS[eventType] ?? 0;
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
}

function formatDecimal(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function buildPlayerKey(playerId: number | null, label: string) {
  return playerId === null
    ? `guest:${label.toLowerCase().replace(/\s+/g, "-")}`
    : `player:${playerId}`;
}

function buildTeamReport(
  team: QuickMatchStatsTeamSnapshot,
  events: QuickMatchStatsEvent[],
): TeamReport {
  const players = new Map<string, PlayerReport>();
  const rosterById = new Map(
    team.players
      .filter((player) => player.id !== null)
      .map((player) => [player.id as number, player]),
  );

  const ensurePlayer = (params: {
    id: number | null;
    label: string;
    shirtNumber: string | null;
  }) => {
    const key = buildPlayerKey(params.id, params.label);
    const current = players.get(key);
    if (current) return current;

    const player: PlayerReport = {
      key,
      label: params.label,
      shirtNumber: params.shirtNumber,
      points: 0,
      made1: 0,
      made2: 0,
      made3: 0,
      misses: 0,
      assists: 0,
      rebounds: 0,
      fouls: 0,
      actions: 0,
      madeShots: 0,
      shotAttempts: 0,
      accuracy: 0,
    };
    players.set(key, player);
    return player;
  };

  for (const player of team.players) {
    ensurePlayer({
      id: player.id,
      label: player.label,
      shirtNumber: player.shirt_number?.trim() || null,
    });
  }

  for (const event of events) {
    if (event.team_key !== team.key) continue;

    const rosterPlayer = event.player_id === null ? null : rosterById.get(event.player_id) ?? null;
    const label = rosterPlayer?.label ?? event.guest_name?.trim() ?? "Invitado";
    const player = ensurePlayer({
      id: event.player_id,
      label,
      shirtNumber: rosterPlayer?.shirt_number?.trim() || null,
    });

    player.actions += 1;
    if (event.event_type === "point_1") player.made1 += 1;
    if (event.event_type === "point_2") player.made2 += 1;
    if (event.event_type === "point_3") player.made3 += 1;
    if (event.event_type === "miss") player.misses += 1;
    if (event.event_type === "assist") player.assists += 1;
    if (event.event_type === "rebound") player.rebounds += 1;
    if (event.event_type === "foul") player.fouls += 1;
    player.points += getEventPoints(event.event_type);
  }

  const playerRows = [...players.values()]
    .map((player) => {
      const madeShots = player.made1 + player.made2 + player.made3;
      const shotAttempts = madeShots + player.misses;
      return {
        ...player,
        madeShots,
        shotAttempts,
        accuracy: shotAttempts > 0 ? (madeShots / shotAttempts) * 100 : 0,
      };
    })
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.assists - left.assists ||
        right.rebounds - left.rebounds ||
        left.label.localeCompare(right.label),
    );

  const sum = (field: keyof PlayerReport) =>
    playerRows.reduce((total, player) => total + Number(player[field] ?? 0), 0);
  const made1 = sum("made1");
  const made2 = sum("made2");
  const made3 = sum("made3");
  const misses = sum("misses");
  const madeShots = made1 + made2 + made3;
  const shotAttempts = madeShots + misses;
  const actions = sum("actions");

  return {
    id: team.id,
    name: team.name,
    logo: getTeamLogoSrc(team.logo_base64),
    score: team.score,
    players: playerRows,
    totals: {
      points: team.score,
      made1,
      made2,
      made3,
      misses,
      assists: sum("assists"),
      rebounds: sum("rebounds"),
      fouls: sum("fouls"),
      actions,
      madeShots,
      shotAttempts,
      accuracy: shotAttempts > 0 ? (madeShots / shotAttempts) * 100 : 0,
      pointsPerAction: actions > 0 ? team.score / actions : 0,
    },
  };
}

function buildPeriods(snapshot: QuickMatchStatsSnapshot, events: QuickMatchStatsEvent[]) {
  const scores = new Map<number, { teamA: number; teamB: number }>();
  for (const event of events) {
    const points = getEventPoints(event.event_type);
    if (!points) continue;
    const period = Math.max(1, event.period);
    const score = scores.get(period) ?? { teamA: 0, teamB: 0 };
    if (event.team_key === "A") score.teamA += points;
    else score.teamB += points;
    scores.set(period, score);
  }

  const periods = [1, 2, 3, 4].map((period) => ({
    label: String(period),
    teamA: scores.get(period)?.teamA ?? 0,
    teamB: scores.get(period)?.teamB ?? 0,
  }));
  const overtime = [...scores.entries()]
    .filter(([period]) => period > 4)
    .reduce(
      (total, [, score]) => ({
        teamA: total.teamA + score.teamA,
        teamB: total.teamB + score.teamB,
      }),
      { teamA: 0, teamB: 0 },
    );

  if (overtime.teamA || overtime.teamB) {
    periods.push({ label: "OT", ...overtime });
  }
  periods.push({
    label: "T",
    teamA: snapshot.match.score_team_a ?? 0,
    teamB: snapshot.match.score_team_b ?? 0,
  });
  return periods;
}

function buildInsights(events: QuickMatchStatsEvent[]) {
  let scoreA = 0;
  let scoreB = 0;
  let lastLeader: "A" | "B" | null = null;
  let leadChanges = 0;
  let ties = 0;
  let largestLeadA = 0;
  let largestLeadB = 0;

  for (const event of events) {
    const points = getEventPoints(event.event_type);
    if (!points) continue;
    if (event.team_key === "A") scoreA += points;
    else scoreB += points;
    if (scoreA === scoreB) ties += 1;
    const leader = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";
    if (leader && lastLeader && leader !== lastLeader) leadChanges += 1;
    if (leader) lastLeader = leader;
    largestLeadA = Math.max(largestLeadA, scoreA - scoreB);
    largestLeadB = Math.max(largestLeadB, scoreB - scoreA);
  }

  return { leadChanges, ties, largestLeadA, largestLeadB };
}

function buildReport(snapshot: QuickMatchStatsSnapshot): MatchReport {
  const activeEvents = snapshot.events
    .filter((event) => event.status === "active")
    .sort((left, right) => left.event_order - right.event_order);

  return {
    snapshot,
    activeEvents,
    teamA: buildTeamReport(snapshot.team_a, activeEvents),
    teamB: buildTeamReport(snapshot.team_b, activeEvents),
    resultLabel: getMatchResultLabel({
      teamAId: snapshot.match.team_a_id,
      teamBId: snapshot.match.team_b_id,
      teamAName: snapshot.team_a.name,
      teamBName: snapshot.team_b.name,
      scoreTeamA: snapshot.match.score_team_a,
      scoreTeamB: snapshot.match.score_team_b,
      winnerTeamId: snapshot.match.winner_team_id,
      isDraw: snapshot.match.is_draw,
    }),
    periods: buildPeriods(snapshot, activeEvents),
    insights: buildInsights(activeEvents),
  };
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

async function imageUrlToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("No se pudo cargar la identidad del reporte.");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("No se pudo preparar la identidad del reporte."));
    reader.onerror = () => reject(new Error("No se pudo preparar la identidad del reporte."));
    reader.readAsDataURL(blob);
  });
}

function drawBrand(doc: jsPDF, brandMark: string | null) {
  if (brandMark) {
    try {
      doc.addImage(brandMark, "PNG", 14, 10, 9, 9);
    } catch {
      // The text identity below remains available if the asset cannot be rendered.
    }
  }
  doc.setTextColor(...COLORS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("ScoreBlaze", 25, 16.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text("REPORTE DE PARTIDO", 196, 14.5, { align: "right" });
}

function drawTeamIdentity(
  doc: jsPDF,
  team: TeamReport,
  x: number,
  nameX: number,
  align: "left" | "center" | "right",
) {
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(x, 42, 18, 18, 4, 4, "F");
  if (team.logo) {
    try {
      doc.addImage(team.logo, "PNG", x + 2, 44, 14, 14);
    } catch {
      doc.setTextColor(...COLORS.orange);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(getInitials(team.name), x + 9, 53, { align: "center" });
    }
  } else {
    doc.setTextColor(...COLORS.orange);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(getInitials(team.name), x + 9, 53, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.white);
  const name = doc.splitTextToSize(team.name, 48)[0] || team.name;
  doc.text(name, nameX, 66.5, { align });
}

function drawFirstPage(doc: jsPDF, report: MatchReport, brandMark: string | null) {
  const { match } = report.snapshot;
  doc.setFillColor(...COLORS.orange);
  doc.rect(0, 0, 210, 4, "F");
  drawBrand(doc, brandMark);

  doc.setFillColor(...COLORS.navy);
  doc.roundedRect(14, 27, 182, 52, 6, 6, "F");
  doc.setFillColor(...COLORS.orange);
  doc.roundedRect(87, 33, 36, 7, 3.5, 3.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...COLORS.white);
  doc.text(getMatchStatusLabel(match.status).toUpperCase(), 105, 37.8, { align: "center" });

  drawTeamIdentity(doc, report.teamA, 29, 38, "center");
  drawTeamIdentity(doc, report.teamB, 163, 172, "center");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.setTextColor(...COLORS.white);
  doc.text(`${report.teamA.score}`, 98, 57, { align: "right" });
  doc.setTextColor(...COLORS.orange);
  doc.text("-", 105, 57, { align: "center" });
  doc.setTextColor(...COLORS.white);
  doc.text(`${report.teamB.score}`, 112, 57, { align: "left" });
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(report.resultLabel, 105, 67, { align: "center" });
  doc.setFontSize(6.5);
  doc.text(
    match.tournament?.trim() || (match.league_id ? "PARTIDO DE LIGA" : "PARTIDO RAPIDO"),
    105,
    74,
    { align: "center" },
  );

  const metadata = [
    ["FECHA", formatMatchDate(match.match_date)],
    ["HORARIO", formatMatchTimeRange(match.start_time, match.end_time)],
    ["SEDE", match.court?.trim() || "Sin sede registrada"],
  ];
  metadata.forEach(([label, value], index) => {
    const x = 14 + index * 62;
    doc.setFillColor(...COLORS.paper);
    doc.roundedRect(x, 84, index === 2 ? 58 : 57, 15, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.orange);
    doc.text(label, x + 4, 89);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.slate);
    const display = doc.splitTextToSize(value, index === 2 ? 50 : 49)[0] || value;
    doc.text(display, x + 4, 95);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  doc.text("Marcador por periodo", 14, 109);
  autoTable(doc, {
    startY: 113,
    margin: { left: 14, right: 14 },
    head: [["EQUIPO", ...report.periods.map((period) => period.label)]],
    body: [
      [report.teamA.name, ...report.periods.map((period) => String(period.teamA))],
      [report.teamB.name, ...report.periods.map((period) => String(period.teamB))],
    ],
    theme: "plain",
    styles: { font: "helvetica", fontSize: 7.5, cellPadding: 2.2, textColor: COLORS.slate },
    headStyles: { fillColor: COLORS.paper, textColor: COLORS.muted, fontStyle: "bold" },
    columnStyles: { 0: { fontStyle: "bold", textColor: COLORS.ink, cellWidth: 60 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === report.periods.length) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = COLORS.orange;
      }
    },
  });

  const periodEnd = (doc as PdfWithTable).lastAutoTable?.finalY ?? 132;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.ink);
  doc.text("Comparativa del partido", 14, periodEnd + 10);

  const comparison = [
    ["Puntos", report.teamA.score, report.teamB.score],
    ["Triples", report.teamA.totals.made3, report.teamB.totals.made3],
    ["Dobles", report.teamA.totals.made2, report.teamB.totals.made2],
    ["Tiros libres", report.teamA.totals.made1, report.teamB.totals.made1],
    ["Tiros convertidos", report.teamA.totals.madeShots, report.teamB.totals.madeShots],
    ["Intentos registrados", report.teamA.totals.shotAttempts, report.teamB.totals.shotAttempts],
    ["Efectividad", formatPercentage(report.teamA.totals.accuracy), formatPercentage(report.teamB.totals.accuracy)],
    ["Asistencias", report.teamA.totals.assists, report.teamB.totals.assists],
    ["Rebotes", report.teamA.totals.rebounds, report.teamB.totals.rebounds],
    ["Faltas", report.teamA.totals.fouls, report.teamB.totals.fouls],
    ["Maxima ventaja", report.insights.largestLeadA, report.insights.largestLeadB],
    ["Puntos por accion", formatDecimal(report.teamA.totals.pointsPerAction), formatDecimal(report.teamB.totals.pointsPerAction)],
  ];

  autoTable(doc, {
    startY: periodEnd + 14,
    margin: { left: 14, right: 14 },
    head: [[report.teamA.name, "ESTADISTICA", report.teamB.name]],
    body: comparison.map(([label, teamA, teamB]) => [teamA, label, teamB]),
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.3,
      cellPadding: 1.75,
      halign: "center",
      textColor: COLORS.slate,
      lineColor: COLORS.line,
      lineWidth: { bottom: 0.15 },
    },
    headStyles: {
      fillColor: COLORS.orangeSoft,
      textColor: COLORS.orange,
      fontStyle: "bold",
      lineWidth: 0,
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: COLORS.ink, cellWidth: 45 },
      1: { cellWidth: 92 },
      2: { fontStyle: "bold", textColor: COLORS.ink, cellWidth: 45 },
    },
  });
}

function drawRosterPage(doc: jsPDF, team: TeamReport) {
  doc.addPage();
  autoTable(doc, {
    startY: 39,
    margin: { top: 39, left: 14, right: 14, bottom: 18 },
    head: [["#", "JUGADOR", "PTS", "T1", "T2", "T3", "AST", "REB", "FLT", "TC", "INT", "EF%"]],
    body:
      team.players.length > 0
        ? team.players.map((player) => [
            player.shirtNumber ?? "-",
            player.label,
            player.points,
            player.made1,
            player.made2,
            player.made3,
            player.assists,
            player.rebounds,
            player.fouls,
            player.madeShots,
            player.shotAttempts,
            formatPercentage(player.accuracy),
          ])
        : [["-", "Sin jugadores registrados", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"]],
    foot: [["", "TOTAL DEL EQUIPO", team.score, team.totals.made1, team.totals.made2, team.totals.made3, team.totals.assists, team.totals.rebounds, team.totals.fouls, team.totals.madeShots, team.totals.shotAttempts, formatPercentage(team.totals.accuracy)]],
    showFoot: "lastPage",
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7,
      cellPadding: 2.4,
      textColor: COLORS.slate,
      lineColor: COLORS.line,
      lineWidth: { bottom: 0.15 },
      halign: "center",
    },
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: "bold" },
    footStyles: { fillColor: COLORS.orangeSoft, textColor: COLORS.orange, fontStyle: "bold" },
    alternateRowStyles: { fillColor: COLORS.paper },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 48, halign: "left", fontStyle: "bold", textColor: COLORS.ink },
    },
    willDrawPage: () => {
      doc.setFillColor(...COLORS.orange);
      doc.rect(0, 0, 210, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.orange);
      doc.setFontSize(7);
      doc.text("RENDIMIENTO DEL EQUIPO", 14, 15);
      doc.setTextColor(...COLORS.ink);
      doc.setFontSize(17);
      doc.text(team.name, 14, 25);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(7.5);
      doc.text(`${team.players.length} jugadores registrados`, 14, 31);
      doc.setFillColor(...COLORS.orangeSoft);
      doc.roundedRect(164, 12, 32, 18, 4, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...COLORS.orange);
      doc.text(String(team.score), 180, 22, { align: "center" });
      doc.setFontSize(6);
      doc.text("PUNTOS", 180, 27, { align: "center" });
    },
  });
}

function addFooters(doc: jsPDF, matchId: number) {
  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...COLORS.line);
    doc.line(14, 283, 196, 283);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(`ScoreBlaze · Partido #${matchId}`, 14, 288);
    doc.text(`Pagina ${page} de ${pageCount}`, 196, 288, { align: "right" });
  }
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function downloadQuickMatchStatsPdf(matchId: number) {
  const snapshot = await getQuickMatchStatsSnapshot(matchId);
  const report = buildReport(snapshot);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let brandMark: string | null = null;

  try {
    brandMark = await imageUrlToDataUrl("/ScoreBlazeLogoMarkClean.png");
  } catch {
    brandMark = null;
  }

  doc.setProperties({
    title: `Resumen de ${report.teamA.name} vs ${report.teamB.name}`,
    subject: "Resumen estadistico del partido",
    author: "ScoreBlaze",
    creator: "ScoreBlaze",
  });
  drawFirstPage(doc, report, brandMark);
  drawRosterPage(doc, report.teamA);
  drawRosterPage(doc, report.teamB);
  addFooters(doc, snapshot.match.id);

  const filename = [
    "resumen-partido",
    snapshot.match.id,
    sanitizeFilePart(report.teamA.name),
    "vs",
    sanitizeFilePart(report.teamB.name),
  ].join("-");
  doc.save(`${filename}.pdf`);
}
