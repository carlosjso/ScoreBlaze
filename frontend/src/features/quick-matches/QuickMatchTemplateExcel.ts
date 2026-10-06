import ExcelJS, { type Cell, type Worksheet } from "exceljs";

import { leaguesService } from "@/features/leagues/Leagues.service";
import { normalizeLeagueTrackedStats } from "@/features/leagues/Leagues.types";
import {
  getQuickMatchStatsSnapshot,
  type QuickMatchStatsEvent,
  type QuickMatchStatsPlayer,
  type QuickMatchStatsSnapshot,
  type QuickMatchStatsTeamSnapshot,
} from "@/features/quick-matches/QuickMatchStats.service";
import {
  replaceMatchScoreboardFromSheet,
  type ScoreboardSheetEventPayload,
} from "@/features/scoreboard/Scoreboard.service";
import { formatMatchDate, formatMatchTimeRange } from "@/features/quick-matches/QuickMatches.types";

const COLORS = {
  ink: "FF0F172A",
  slate: "FF475569",
  muted: "FF94A3B8",
  line: "FFCBD5E1",
  lineSoft: "FFE2E8F0",
  paper: "FFF8FAFC",
  white: "FFFFFFFF",
  orange: "FFF97316",
  orangeDark: "FFC2410C",
  orangeSoft: "FFFFF7ED",
  navy: "FF111827",
  blueSoft: "FFEFF6FF",
} as const;

const TEMPLATE_VERSION = "1.0";
const OFFICIAL_ROSTER_SLOTS = 15;
const MAX_IMPORTED_EVENTS = 5000;

const thinBorder = {
  top: { style: "thin" as const, color: { argb: COLORS.line } },
  left: { style: "thin" as const, color: { argb: COLORS.line } },
  bottom: { style: "thin" as const, color: { argb: COLORS.line } },
  right: { style: "thin" as const, color: { argb: COLORS.line } },
};

const strongBorder = {
  top: { style: "medium" as const, color: { argb: COLORS.ink } },
  left: { style: "medium" as const, color: { argb: COLORS.ink } },
  bottom: { style: "medium" as const, color: { argb: COLORS.ink } },
  right: { style: "medium" as const, color: { argb: COLORS.ink } },
};

type LeagueContext = Awaited<ReturnType<typeof leaguesService.getLeague>> | null;
type WorkbookMode = "template" | "current";

type EventCounts = Record<
  "point_1" | "point_2" | "point_3" | "miss" | "assist" | "rebound" | "foul",
  number
>;

const EMPTY_COUNTS: EventCounts = {
  point_1: 0,
  point_2: 0,
  point_3: 0,
  miss: 0,
  assist: 0,
  rebound: 0,
  foul: 0,
};

function getActiveEvents(snapshot: QuickMatchStatsSnapshot) {
  return snapshot.events.filter((event) => event.status === "active");
}

function getTeamPlayerKey(teamId: number, playerId: number) {
  return `${teamId}:${playerId}`;
}

function countPlayerEvents(
  events: QuickMatchStatsEvent[],
  teamId: number,
  playerId: number | null,
) {
  const counts = { ...EMPTY_COUNTS };
  if (playerId === null) return counts;
  events.forEach((event) => {
    if (event.team_id === teamId && event.player_id === playerId) {
      counts[event.event_type] += 1;
    }
  });
  return counts;
}

function getEventPoints(eventType: QuickMatchStatsEvent["event_type"]) {
  if (eventType === "point_1") return 1;
  if (eventType === "point_2") return 2;
  if (eventType === "point_3") return 3;
  return 0;
}

function getScorerNumber(
  event: QuickMatchStatsEvent,
  playerNumbersByTeamAndId: Map<string, string>,
) {
  if (event.player_id !== null) {
    return playerNumbersByTeamAndId.get(getTeamPlayerKey(event.team_id, event.player_id)) ?? "";
  }

  const guestLabel = event.guest_name?.trim() || "";
  const fallbackMatch = guestLabel.match(new RegExp(`^${event.team_key}(\\d+)$`, "i"));
  if (fallbackMatch) return fallbackMatch[1];

  const shirtMatch = guestLabel.match(/^#?(\d+)\b/);
  return shirtMatch?.[1] ?? "";
}

function setRangeStyle(
  sheet: Worksheet,
  startRow: number,
  endRow: number,
  startColumn: number,
  endColumn: number,
  style: Partial<Cell["style"]>,
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      const cell = sheet.getCell(row, column);
      Object.assign(cell, style);
    }
  }
}

function mergeWithValue(
  sheet: Worksheet,
  range: string,
  value: string | number,
  style?: Partial<Cell["style"]>,
) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]);
  cell.value = value;
  if (style) Object.assign(cell, style);
  return cell;
}

function applySectionTitle(cell: Cell, fill: string = COLORS.navy) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  cell.font = { name: "Arial", size: 9, bold: true, color: { argb: COLORS.white } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = strongBorder;
}

function applyColumnHeader(cell: Cell) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paper } };
  cell.font = { name: "Arial", size: 7, bold: true, color: { argb: COLORS.slate } };
  cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  cell.border = thinBorder;
}

function applyEditableCell(cell: Cell, centered = true) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.orangeSoft } };
  cell.font = { name: "Arial", size: 8, color: { argb: COLORS.ink } };
  cell.alignment = {
    horizontal: centered ? "center" : "left",
    vertical: "middle",
    wrapText: true,
  };
  cell.border = thinBorder;
  cell.protection = { locked: false };
}

function applyLockedCell(cell: Cell, centered = true) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.white } };
  cell.font = { name: "Arial", size: 8, color: { argb: COLORS.ink } };
  cell.alignment = {
    horizontal: centered ? "center" : "left",
    vertical: "middle",
    wrapText: true,
  };
  cell.border = thinBorder;
  cell.protection = { locked: true };
}

function setWholeNumberValidation(cell: Cell, maximum = 999) {
  cell.dataValidation = {
    type: "whole",
    operator: "between",
    allowBlank: true,
    showErrorMessage: true,
    errorStyle: "stop",
    errorTitle: "Dato no valido",
    error: `Escribe un numero entero entre 0 y ${maximum}.`,
    formulae: [0, maximum],
  };
}

function normalizePlayerNumber(player: QuickMatchStatsPlayer) {
  return player.shirt_number?.trim() || "";
}

function buildPlayerSheetNumbers(team: QuickMatchStatsTeamSnapshot) {
  const usedNumbers = new Set(
    team.players
      .map(normalizePlayerNumber)
      .filter(Boolean)
      .map((value) => value.toLowerCase()),
  );
  let nextTemporaryNumber = 1;

  return team.players.map((player) => {
    const registeredNumber = normalizePlayerNumber(player);
    if (registeredNumber) return registeredNumber;

    while (usedNumbers.has(String(nextTemporaryNumber))) nextTemporaryNumber += 1;
    const temporaryNumber = String(nextTemporaryNumber);
    usedNumbers.add(String(nextTemporaryNumber));
    nextTemporaryNumber += 1;
    return temporaryNumber;
  });
}

function sanitizeFilePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getCompetitionStageLabel(snapshot: QuickMatchStatsSnapshot) {
  const match = snapshot.match;
  if (match.competition_stage === "GROUP_STAGE") {
    return match.group_stage_group_key
      ? `Fase de grupos · ${match.group_stage_group_key}`
      : "Fase de grupos";
  }
  if (match.competition_stage === "FINAL_PHASE") {
    return match.bracket_round ? `Fase final · Ronda ${match.bracket_round}` : "Fase final";
  }
  return "Fase regular";
}

function prepareSheet(sheet: Worksheet, orientation: "portrait" | "landscape") {
  sheet.views = [{ showGridLines: false }];
  sheet.pageSetup = {
    paperSize: 9,
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    horizontalCentered: true,
    verticalCentered: false,
    margins: {
      left: 0.25,
      right: 0.25,
      top: 0.35,
      bottom: 0.35,
      header: 0.15,
      footer: 0.15,
    },
  };
  sheet.headerFooter.oddFooter = "&LScoreBlaze&CActa de partido&RPagina &P de &N";
}

function drawDocumentHeader(
  sheet: Worksheet,
  snapshot: QuickMatchStatsSnapshot,
  league: LeagueContext,
) {
  sheet.getRow(1).height = 22;
  sheet.getRow(2).height = 19;
  sheet.getRow(3).height = 16;
  sheet.getRow(4).height = 7;

  mergeWithValue(sheet, "A1:D3", "SCORE\nBLAZE", {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.orange } },
    font: { name: "Arial", size: 15, bold: true, color: { argb: COLORS.white } },
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: strongBorder,
  });

  mergeWithValue(sheet, "E1:W1", league?.name?.toUpperCase() || "ACTA OFICIAL DE PARTIDO", {
    font: { name: "Arial", size: 13, bold: true, color: { argb: COLORS.ink } },
    alignment: { horizontal: "center", vertical: "middle", shrinkToFit: true },
  });
  mergeWithValue(sheet, "E2:W2", "HOJA DE ANOTACION Y CONTROL", {
    font: { name: "Arial", size: 9, bold: true, color: { argb: COLORS.orangeDark } },
    alignment: { horizontal: "center", vertical: "middle" },
  });
  mergeWithValue(
    sheet,
    "E3:W3",
    league?.category || snapshot.match.tournament?.trim() || "Basquetbol",
    {
      font: { name: "Arial", size: 8, color: { argb: COLORS.slate } },
      alignment: { horizontal: "center", vertical: "middle" },
    },
  );

  setRangeStyle(sheet, 4, 4, 1, 23, {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.orange } },
  });
}

function drawMatchInformation(
  sheet: Worksheet,
  snapshot: QuickMatchStatsSnapshot,
  league: LeagueContext,
) {
  const { match } = snapshot;
  const rows: Array<Array<[string, string]>> = [
    [
      ["Competencia", league?.name || match.tournament?.trim() || "Partido rapido"],
      ["Categoria", league?.category || "Sin categoria"],
    ],
    [
      ["Partido", `#${match.id}`],
      ["Fase", getCompetitionStageLabel(snapshot)],
    ],
    [
      ["Fecha", formatMatchDate(match.match_date)],
      ["Horario", formatMatchTimeRange(match.start_time, match.end_time)],
    ],
    [
      ["Cancha", match.court?.trim() || "Sin sede registrada"],
      ["Jornada", ""],
    ],
  ];

  rows.forEach((pairs, index) => {
    const row = 5 + index;
    sheet.getRow(row).height = 16;
    const [[leftLabel, leftValue], [rightLabel, rightValue]] = pairs;
    mergeWithValue(sheet, `A${row}:C${row}`, leftLabel.toUpperCase(), {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paper } },
      font: { name: "Arial", size: 7, bold: true, color: { argb: COLORS.slate } },
      alignment: { horizontal: "left", vertical: "middle" },
      border: thinBorder,
    });
    const leftCell = mergeWithValue(sheet, `D${row}:K${row}`, leftValue, {
      font: { name: "Arial", size: 8, bold: true, color: { argb: COLORS.ink } },
      alignment: { horizontal: "left", vertical: "middle", shrinkToFit: true },
      border: thinBorder,
    });
    mergeWithValue(sheet, `L${row}:N${row}`, rightLabel.toUpperCase(), {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paper } },
      font: { name: "Arial", size: 7, bold: true, color: { argb: COLORS.slate } },
      alignment: { horizontal: "left", vertical: "middle" },
      border: thinBorder,
    });
    const rightCell = mergeWithValue(sheet, `O${row}:W${row}`, rightValue, {
      font: { name: "Arial", size: 8, bold: true, color: { argb: COLORS.ink } },
      alignment: { horizontal: "left", vertical: "middle", shrinkToFit: true },
      border: thinBorder,
    });
    if (leftLabel === "Cancha") applyEditableCell(leftCell, false);
    if (rightLabel === "Jornada") {
      applyEditableCell(rightCell, false);
    }
  });
}

function drawRoster(
  sheet: Worksheet,
  team: QuickMatchStatsTeamSnapshot,
  titleRow: number,
  events: QuickMatchStatsEvent[],
  mode: WorkbookMode,
) {
  const playerNumbers = buildPlayerSheetNumbers(team);
  const headerRow = titleRow + 1;
  const firstPlayerRow = titleRow + 2;
  const lastPlayerRow = firstPlayerRow + OFFICIAL_ROSTER_SLOTS - 1;
  const staffRow = lastPlayerRow + 1;
  const controlsRow = staffRow + 1;

  const titleCell = mergeWithValue(sheet, `A${titleRow}:K${titleRow}`, team.name.toUpperCase());
  applySectionTitle(titleCell, COLORS.orangeDark);
  sheet.getRow(titleRow).height = 18;

  const headers = ["No.", "APELLIDOS Y NOMBRE", "F1", "F2", "F3", "F4", "F5"];
  sheet.getCell(headerRow, 1).value = headers[0];
  mergeWithValue(sheet, `B${headerRow}:F${headerRow}`, headers[1]);
  headers.slice(2).forEach((header, index) => {
    sheet.getCell(headerRow, 7 + index).value = header;
  });
  setRangeStyle(sheet, headerRow, headerRow, 1, 11, {});
  for (let column = 1; column <= 11; column += 1) applyColumnHeader(sheet.getCell(headerRow, column));
  sheet.getRow(headerRow).height = 16;

  for (let slot = 0; slot < OFFICIAL_ROSTER_SLOTS; slot += 1) {
    const row = firstPlayerRow + slot;
    const player = team.players[slot] ?? null;
    sheet.getRow(row).height = 15;
    const numberCell = sheet.getCell(row, 1);
    numberCell.value = player ? playerNumbers[slot] : "";
    const nameCell = mergeWithValue(sheet, `B${row}:F${row}`, player?.label ?? "");

    if (player) {
      applyLockedCell(numberCell);
      applyLockedCell(nameCell, false);
    } else {
      applyEditableCell(numberCell);
      applyEditableCell(nameCell, false);
    }

    for (let foul = 0; foul < 5; foul += 1) {
      const foulCell = sheet.getCell(row, 7 + foul);
      applyEditableCell(foulCell);
      if (mode === "current" && player) {
        const foulCount = countPlayerEvents(events, team.id, player.id).foul;
        foulCell.value = foul < foulCount ? "X" : "";
      }
      foulCell.dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"X,T"'],
        showErrorMessage: true,
        errorTitle: "Marca no valida",
        error: "Usa X para falta personal o T para falta tecnica.",
      };
    }
  }

  mergeWithValue(sheet, `A${staffRow}:C${staffRow}`, "ENTRENADOR", {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paper } },
    font: { name: "Arial", size: 7, bold: true, color: { argb: COLORS.slate } },
    alignment: { horizontal: "left", vertical: "middle" },
    border: thinBorder,
  });
  const coachCell = mergeWithValue(sheet, `D${staffRow}:K${staffRow}`, "");
  applyEditableCell(coachCell, false);

  mergeWithValue(sheet, `A${controlsRow}:C${controlsRow}`, "TIEMPOS FUERA", {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paper } },
    font: { name: "Arial", size: 7, bold: true, color: { argb: COLORS.slate } },
    alignment: { horizontal: "left", vertical: "middle" },
    border: thinBorder,
  });
  for (let column = 4; column <= 6; column += 1) applyEditableCell(sheet.getCell(controlsRow, column));
  mergeWithValue(sheet, `G${controlsRow}:H${controlsRow}`, "FALTAS EQ.", {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.paper } },
    font: { name: "Arial", size: 7, bold: true, color: { argb: COLORS.slate } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: thinBorder,
  });
  for (let column = 9; column <= 11; column += 1) applyEditableCell(sheet.getCell(controlsRow, column));

  return { lastRow: controlsRow };
}

function getProgressiveScoreCell(sheet: Worksheet, teamKey: "A" | "B", score: number) {
  const zeroBased = score - 1;
  const block = Math.floor(zeroBased / 40);
  const row = 11 + (zeroBased % 40);
  const startColumn = 12 + block * 3;
  return sheet.getCell(row, startColumn + (teamKey === "A" ? 0 : 2));
}

function drawProgressiveScore(
  sheet: Worksheet,
  snapshot: QuickMatchStatsSnapshot,
  mode: WorkbookMode,
) {
  const titleCell = mergeWithValue(sheet, "L9:W9", "MARCADOR PROGRESIVO");
  applySectionTitle(titleCell);
  sheet.getRow(9).height = 18;

  const blockStartColumns = [12, 15, 18, 21];
  blockStartColumns.forEach((startColumn) => {
    ["A", "#", "B"].forEach((header, index) => {
      const cell = sheet.getCell(10, startColumn + index);
      cell.value = header;
      applyColumnHeader(cell);
    });
  });
  sheet.getRow(10).height = 15;

  for (let offset = 0; offset < 40; offset += 1) {
    const row = 11 + offset;
    sheet.getRow(row).height = 12.5;
    blockStartColumns.forEach((startColumn, block) => {
      const left = sheet.getCell(row, startColumn);
      const score = sheet.getCell(row, startColumn + 1);
      const right = sheet.getCell(row, startColumn + 2);
      applyEditableCell(left);
      applyLockedCell(score);
      applyEditableCell(right);
      score.value = block * 40 + offset + 1;
      score.font = { name: "Arial", size: 7, bold: true, color: { argb: COLORS.slate } };
      left.dataValidation = right.dataValidation = {
        type: "whole",
        operator: "between",
        allowBlank: true,
        showErrorMessage: true,
        errorTitle: "Numero no valido",
        error: "Escribe el numero de camiseta del jugador que anoto.",
        formulae: [0, 999],
      };
    });
  }

  if (mode !== "current") return;

  const runningScore = { A: 0, B: 0 };
  const playerNumbersByTeamAndId = new Map<string, string>();
  ([snapshot.team_a, snapshot.team_b] as const).forEach((team) => {
    const playerNumbers = buildPlayerSheetNumbers(team);
    team.players.forEach((player, index) => {
      if (player.id !== null) {
        playerNumbersByTeamAndId.set(
          getTeamPlayerKey(team.id, player.id),
          playerNumbers[index],
        );
      }
    });
  });
  getActiveEvents(snapshot).forEach((event) => {
    const points = getEventPoints(event.event_type);
    if (!points) return;
    runningScore[event.team_key] += points;
    if (runningScore[event.team_key] > 160) return;
    getProgressiveScoreCell(sheet, event.team_key, runningScore[event.team_key]).value =
      getScorerNumber(event, playerNumbersByTeamAndId);
  });
}

function drawMatchClosure(
  sheet: Worksheet,
  firstRow: number,
  teamNames: { teamA: string; teamB: string },
  snapshot: QuickMatchStatsSnapshot,
  mode: WorkbookMode,
) {
  const titleCell = mergeWithValue(sheet, `A${firstRow}:W${firstRow}`, "CIERRE DEL PARTIDO");
  applySectionTitle(titleCell);
  sheet.getRow(firstRow).height = 18;

  const headerRow = firstRow + 1;
  const teamARow = firstRow + 2;
  const teamBRow = firstRow + 3;
  const labels = ["EQUIPO", "1", "2", "3", "4", "OT", "FINAL"];
  const ranges = [
    ["A", "F"],
    ["G", "H"],
    ["I", "J"],
    ["K", "L"],
    ["M", "N"],
    ["O", "P"],
    ["Q", "S"],
  ];
  labels.forEach((label, index) => {
    const cell = mergeWithValue(sheet, `${ranges[index][0]}${headerRow}:${ranges[index][1]}${headerRow}`, label);
    applyColumnHeader(cell);
  });
  mergeWithValue(sheet, `T${headerRow}:W${headerRow}`, "GANADOR");
  for (let column = 20; column <= 23; column += 1) applyColumnHeader(sheet.getCell(headerRow, column));

  [teamARow, teamBRow].forEach((row, index) => {
    const teamCell = mergeWithValue(
      sheet,
      `A${row}:F${row}`,
      index === 0 ? teamNames.teamA : teamNames.teamB,
    );
    applyLockedCell(teamCell, false);
    ranges.slice(1).forEach(([start, end]) => {
      const cell = mergeWithValue(sheet, `${start}${row}:${end}${row}`, "");
      applyEditableCell(cell);
      setWholeNumberValidation(cell);
    });
  });
  const winnerCell = mergeWithValue(sheet, `T${teamARow}:W${teamBRow}`, "");
  applyEditableCell(winnerCell, false);

  if (mode === "current") {
    const periodScores = {
      A: [0, 0, 0, 0, 0],
      B: [0, 0, 0, 0, 0],
    };
    getActiveEvents(snapshot).forEach((event) => {
      const points = getEventPoints(event.event_type);
      if (!points) return;
      const periodIndex = Math.min(Math.max(event.period, 1), 5) - 1;
      periodScores[event.team_key][periodIndex] += points;
    });
    const scoreColumns = [7, 9, 11, 13, 15];
    ([teamARow, teamBRow] as const).forEach((row, teamIndex) => {
      const key = teamIndex === 0 ? "A" : "B";
      scoreColumns.forEach((column, periodIndex) => {
        sheet.getCell(row, column).value = periodScores[key][periodIndex];
      });
      sheet.getCell(row, 17).value = periodScores[key].reduce((sum, value) => sum + value, 0);
    });
    const scoreA = periodScores.A.reduce((sum, value) => sum + value, 0);
    const scoreB = periodScores.B.reduce((sum, value) => sum + value, 0);
    winnerCell.value = scoreA === scoreB ? "Empate" : scoreA > scoreB ? teamNames.teamA : teamNames.teamB;
  }

  const officialsRow = firstRow + 5;
  [
    ["A", "D", "ARBITRO PRINCIPAL"],
    ["E", "H", "ARBITRO AUXILIAR"],
    ["I", "L", "ANOTADOR"],
    ["M", "P", "CRONOMETRISTA"],
    ["Q", "T", "RESPONSABLE"],
  ].forEach(([start, end, label]) => {
    const labelCell = mergeWithValue(sheet, `${start}${officialsRow}:${end}${officialsRow}`, label);
    applyColumnHeader(labelCell);
    const inputCell = mergeWithValue(sheet, `${start}${officialsRow + 1}:${end}${officialsRow + 2}`, "");
    applyEditableCell(inputCell, false);
  });
  const signatureCell = mergeWithValue(sheet, `U${officialsRow}:W${officialsRow + 2}`, "FIRMA\nCAPITAN");
  applyEditableCell(signatureCell);

  const notesRow = officialsRow + 4;
  const notesTitle = mergeWithValue(sheet, `A${notesRow}:W${notesRow}`, "OBSERVACIONES E INCIDENCIAS");
  applyColumnHeader(notesTitle);
  const notesCell = mergeWithValue(sheet, `A${notesRow + 1}:W${notesRow + 4}`, "");
  applyEditableCell(notesCell, false);

  return notesRow + 4;
}

function buildOfficialSheet(
  workbook: ExcelJS.Workbook,
  snapshot: QuickMatchStatsSnapshot,
  league: LeagueContext,
  mode: WorkbookMode,
) {
  const sheet = workbook.addWorksheet("Acta del partido", {
    properties: { defaultRowHeight: 15 },
  });
  prepareSheet(sheet, "portrait");

  const widths = [4, 4, 4, 4, 4, 4, 3.2, 3.2, 3.2, 3.2, 3.2];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  for (let column = 12; column <= 23; column += 1) {
    sheet.getColumn(column).width = column % 3 === 1 ? 3.2 : 2.8;
  }

  drawDocumentHeader(sheet, snapshot, league);
  drawMatchInformation(sheet, snapshot, league);
  drawProgressiveScore(sheet, snapshot, mode);
  const activeEvents = getActiveEvents(snapshot);
  const teamA = drawRoster(sheet, snapshot.team_a, 9, activeEvents, mode);
  const teamB = drawRoster(sheet, snapshot.team_b, teamA.lastRow + 2, activeEvents, mode);
  const finalRow = drawMatchClosure(sheet, Math.max(52, teamB.lastRow + 2), {
    teamA: snapshot.team_a.name,
    teamB: snapshot.team_b.name,
  }, snapshot, mode);

  sheet.autoFilter = undefined;
  sheet.pageSetup.printArea = `A1:W${finalRow}`;
  sheet.properties.defaultColWidth = 3;

  return sheet;
}

function getMetricColumns(trackedStats: string[]) {
  const enabled = new Set(normalizeLeagueTrackedStats(trackedStats));
  const columns = [
    { key: "number", label: "No.", width: 8 },
    { key: "player", label: "Jugador", width: 30 },
    { key: "made1", label: "TL", width: 10 },
    { key: "made2", label: "2PT", width: 10 },
    { key: "made3", label: "3PT", width: 10 },
  ];
  if (enabled.has("Fallo")) columns.push({ key: "miss", label: "Fallos", width: 11 });
  if (enabled.has("Asistencias")) columns.push({ key: "assist", label: "AST", width: 10 });
  if (enabled.has("Rebotes")) columns.push({ key: "rebound", label: "REB", width: 10 });
  if (enabled.has("Faltas")) columns.push({ key: "foul", label: "Faltas", width: 11 });
  columns.push({ key: "points", label: "PTS", width: 11 });
  return columns;
}

function drawStatsTeamTable(
  sheet: Worksheet,
  team: QuickMatchStatsTeamSnapshot,
  startRow: number,
  columns: ReturnType<typeof getMetricColumns>,
  events: QuickMatchStatsEvent[],
  mode: WorkbookMode,
) {
  const playerNumbers = buildPlayerSheetNumbers(team);
  const endColumn = columns.length;
  const titleCell = mergeWithValue(
    sheet,
    `${sheet.getColumn(1).letter}${startRow}:${sheet.getColumn(endColumn).letter}${startRow}`,
    team.name.toUpperCase(),
  );
  applySectionTitle(titleCell, COLORS.orangeDark);

  columns.forEach((column, index) => {
    const cell = sheet.getCell(startRow + 1, index + 1);
    cell.value = column.label;
    applyColumnHeader(cell);
  });

  const rowCount = Math.max(OFFICIAL_ROSTER_SLOTS, team.players.length);
  for (let slot = 0; slot < rowCount; slot += 1) {
    const row = startRow + 2 + slot;
    const player = team.players[slot] ?? null;
    const counts =
      mode === "current"
        ? countPlayerEvents(events, team.id, player?.id ?? null)
        : EMPTY_COUNTS;
    sheet.getRow(row).height = 18;

    columns.forEach((column, index) => {
      const cell = sheet.getCell(row, index + 1);
      if (column.key === "number") cell.value = player ? playerNumbers[slot] : "";
      if (column.key === "player") cell.value = player?.label ?? "";
      if (column.key === "made1" && player) cell.value = counts.point_1 || "";
      if (column.key === "made2" && player) cell.value = counts.point_2 || "";
      if (column.key === "made3" && player) cell.value = counts.point_3 || "";
      if (column.key === "miss" && player) cell.value = counts.miss || "";
      if (column.key === "assist" && player) cell.value = counts.assist || "";
      if (column.key === "rebound" && player) cell.value = counts.rebound || "";
      if (column.key === "foul" && player) cell.value = counts.foul || "";

      if ((column.key === "number" || column.key === "player") && player) {
        applyLockedCell(cell, column.key !== "player");
      } else if (column.key === "points") {
        const made1Column = columns.findIndex((item) => item.key === "made1") + 1;
        const made2Column = columns.findIndex((item) => item.key === "made2") + 1;
        const made3Column = columns.findIndex((item) => item.key === "made3") + 1;
        cell.value = {
          formula: `${sheet.getColumn(made1Column).letter}${row}+(${sheet.getColumn(made2Column).letter}${row}*2)+(${sheet.getColumn(made3Column).letter}${row}*3)`,
        };
        applyLockedCell(cell);
        cell.font = { name: "Arial", size: 8, bold: true, color: { argb: COLORS.orangeDark } };
      } else {
        applyEditableCell(cell, column.key !== "player");
        if (!["number", "player"].includes(column.key)) setWholeNumberValidation(cell, 999);
      }
    });
  }

  const totalRow = startRow + 2 + rowCount;
  const totalCell = mergeWithValue(sheet, `A${totalRow}:B${totalRow}`, "TOTAL DEL EQUIPO");
  applyColumnHeader(totalCell);
  for (let column = 3; column <= endColumn; column += 1) {
    const cell = sheet.getCell(totalRow, column);
    const letter = sheet.getColumn(column).letter;
    cell.value = { formula: `SUM(${letter}${startRow + 2}:${letter}${totalRow - 1})` };
    applyLockedCell(cell);
    cell.font = { name: "Arial", size: 8, bold: true, color: { argb: COLORS.orangeDark } };
  }

  return totalRow;
}

function buildStatsSheet(
  workbook: ExcelJS.Workbook,
  snapshot: QuickMatchStatsSnapshot,
  mode: WorkbookMode,
) {
  const sheet = workbook.addWorksheet("Estadisticas", {
    properties: { defaultRowHeight: 18 },
  });
  prepareSheet(sheet, "landscape");
  const columns = getMetricColumns(snapshot.match.tracked_stats);
  columns.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });

  const endColumnLetter = sheet.getColumn(columns.length).letter;
  const heading = mergeWithValue(sheet, `A1:${endColumnLetter}1`, "CAPTURA DE ESTADISTICAS", {
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.navy } },
    font: { name: "Arial", size: 15, bold: true, color: { argb: COLORS.white } },
    alignment: { horizontal: "center", vertical: "middle" },
    border: strongBorder,
  });
  heading.protection = { locked: true };
  sheet.getRow(1).height = 28;
  mergeWithValue(
    sheet,
    `A2:${endColumnLetter}2`,
    `Partido #${snapshot.match.id} · ${snapshot.team_a.name} vs ${snapshot.team_b.name}`,
    {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.orangeSoft } },
      font: { name: "Arial", size: 9, bold: true, color: { argb: COLORS.orangeDark } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: thinBorder,
    },
  );
  mergeWithValue(
    sheet,
    `A3:${endColumnLetter}3`,
    "Completa unicamente las celdas en color crema. PTS se calcula automaticamente.",
    {
      font: { name: "Arial", size: 8, italic: true, color: { argb: COLORS.slate } },
      alignment: { horizontal: "center", vertical: "middle" },
    },
  );

  const activeEvents = getActiveEvents(snapshot);
  const teamAEnd = drawStatsTeamTable(sheet, snapshot.team_a, 5, columns, activeEvents, mode);
  const teamBEnd = drawStatsTeamTable(sheet, snapshot.team_b, teamAEnd + 3, columns, activeEvents, mode);
  sheet.pageSetup.printArea = `A1:${endColumnLetter}${teamBEnd}`;
  sheet.views = [{ state: "frozen", ySplit: 4, showGridLines: false }];
  return sheet;
}

function buildMetadataSheet(
  workbook: ExcelJS.Workbook,
  snapshot: QuickMatchStatsSnapshot,
  league: LeagueContext,
  mode: WorkbookMode,
) {
  const sheet = workbook.addWorksheet("_scoreblaze");
  sheet.state = "veryHidden";
  const metadata: Array<[string, string | number]> = [
    ["template_type", "match_manual_entry"],
    ["template_version", TEMPLATE_VERSION],
    ["workbook_mode", mode],
    ["match_id", snapshot.match.id],
    ["league_id", snapshot.match.league_id ?? ""],
    ["league_name", league?.name ?? ""],
    ["team_a_id", snapshot.team_a.id],
    ["team_a_name", snapshot.team_a.name],
    ["team_b_id", snapshot.team_b.id],
    ["team_b_name", snapshot.team_b.name],
    ["tracked_stats", JSON.stringify(snapshot.match.tracked_stats)],
    ["generated_at", new Date().toISOString()],
  ];
  metadata.forEach(([key, value], index) => {
    sheet.getCell(index + 1, 1).value = key;
    sheet.getCell(index + 1, 2).value = value;
  });

  const playerStart = metadata.length + 2;
  ["team_key", "team_id", "player_id", "shirt_number", "player_label"].forEach(
    (header, index) => {
      sheet.getCell(playerStart, index + 1).value = header;
    },
  );
  let row = playerStart + 1;
  ([snapshot.team_a, snapshot.team_b] as const).forEach((team) => {
    const playerNumbers = buildPlayerSheetNumbers(team);
    team.players.forEach((player, index) => {
      sheet.getCell(row, 1).value = team.key;
      sheet.getCell(row, 2).value = team.id;
      sheet.getCell(row, 3).value = player.id ?? "";
      sheet.getCell(row, 4).value = playerNumbers[index];
      sheet.getCell(row, 5).value = player.label;
      row += 1;
    });
  });
  return sheet;
}

async function protectWorkbookSheets(sheets: Worksheet[]) {
  await Promise.all(
    sheets.map((sheet) =>
      sheet.protect("ScoreBlaze", {
        spinCount: 10000,
        selectLockedCells: false,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertColumns: false,
        insertRows: false,
        deleteColumns: false,
        deleteRows: false,
        sort: false,
        autoFilter: false,
      }),
    ),
  );
}

export async function buildQuickMatchTemplateWorkbook(
  snapshot: QuickMatchStatsSnapshot,
  league: LeagueContext = null,
  mode: WorkbookMode = "template",
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ScoreBlaze";
  workbook.lastModifiedBy = "ScoreBlaze";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = "Plantilla de captura manual de partido";
  workbook.title = `Partido #${snapshot.match.id}: ${snapshot.team_a.name} vs ${snapshot.team_b.name}`;
  workbook.company = "ScoreBlaze";
  workbook.calcProperties.fullCalcOnLoad = true;

  const officialSheet = buildOfficialSheet(workbook, snapshot, league, mode);
  const statsSheet = buildStatsSheet(workbook, snapshot, mode);
  const metadataSheet = buildMetadataSheet(workbook, snapshot, league, mode);
  await protectWorkbookSheets([officialSheet, statsSheet, metadataSheet]);
  return workbook;
}

function triggerWorkbookDownload(buffer: ExcelJS.Buffer, filename: string) {
  const bytes = new Uint8Array(buffer as ArrayBuffer);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function getWorkbookContext(matchId: number) {
  const snapshot = await getQuickMatchStatsSnapshot(matchId);
  let league: LeagueContext = null;
  if (snapshot.match.league_id !== null) {
    try {
      league = await leaguesService.getLeague(snapshot.match.league_id);
    } catch {
      league = null;
    }
  }
  return { snapshot, league };
}

export async function downloadQuickMatchTemplate(matchId: number) {
  const { snapshot, league } = await getWorkbookContext(matchId);

  const workbook = await buildQuickMatchTemplateWorkbook(snapshot, league, "template");
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = [
    "plantilla-partido",
    snapshot.match.id,
    sanitizeFilePart(snapshot.team_a.name),
    "vs",
    sanitizeFilePart(snapshot.team_b.name),
  ].join("-");
  triggerWorkbookDownload(buffer, `${filename}.xlsx`);
}

export async function downloadQuickMatchWorkbook(matchId: number) {
  const { snapshot, league } = await getWorkbookContext(matchId);
  const workbook = await buildQuickMatchTemplateWorkbook(snapshot, league, "current");
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = [
    "partido",
    snapshot.match.id,
    sanitizeFilePart(snapshot.team_a.name),
    "vs",
    sanitizeFilePart(snapshot.team_b.name),
  ].join("-");
  triggerWorkbookDownload(buffer, `${filename}.xlsx`);
}

function getCellText(cell: Cell) {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  if (typeof value === "object" && "result" in value) {
    const result = value.result;
    return result === null || result === undefined ? "" : String(result).trim();
  }
  return String(value).trim();
}

function getCellCount(cell: Cell, label: string) {
  const raw = getCellText(cell);
  if (!raw) return 0;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 999) {
    throw new Error(`${label} debe ser un numero entero entre 0 y 999.`);
  }
  return value;
}

function normalizeLookup(value: string) {
  return value.trim().toLocaleLowerCase("es-MX").replace(/\s+/g, " ");
}

function readMetadata(workbook: ExcelJS.Workbook) {
  const sheet = workbook.getWorksheet("_scoreblaze");
  if (!sheet) throw new Error("El archivo no es una hoja de partido de ScoreBlaze.");
  const metadata = new Map<string, string>();
  for (let row = 1; row <= 30; row += 1) {
    const key = getCellText(sheet.getCell(row, 1));
    if (key === "team_key") break;
    if (key) metadata.set(key, getCellText(sheet.getCell(row, 2)));
  }
  return metadata;
}

function findRowByFirstCell(sheet: Worksheet, value: string) {
  const expected = normalizeLookup(value);
  for (let row = 1; row <= sheet.rowCount; row += 1) {
    if (normalizeLookup(getCellText(sheet.getCell(row, 1))) === expected) return row;
  }
  return null;
}

function resolvePlayer(
  team: QuickMatchStatsTeamSnapshot,
  shirtNumber: string,
  label: string,
) {
  const normalizedLabel = normalizeLookup(label);
  const normalizedNumber = normalizeLookup(shirtNumber);
  const byLabel = normalizedLabel
    ? team.players.find((player) => normalizeLookup(player.label) === normalizedLabel)
    : null;
  if (byLabel) return { playerId: byLabel.id, guestName: byLabel.id === null ? byLabel.label : null };

  const playerNumbers = buildPlayerSheetNumbers(team);
  const byNumber = normalizedNumber
    ? team.players.filter((_, index) => (
        normalizeLookup(playerNumbers[index]) === normalizedNumber
      ))
    : [];
  if (byNumber.length === 1) {
    const player = byNumber[0];
    return { playerId: player.id, guestName: player.id === null ? player.label : null };
  }
  if (byNumber.length > 1) {
    throw new Error(`El numero ${shirtNumber} esta repetido en ${team.name}; usa el nombre del jugador.`);
  }

  const guestName = label.trim() || (shirtNumber.trim() ? `Jugador ${shirtNumber.trim()}` : "");
  if (!guestName) return null;
  return { playerId: null, guestName };
}

type MutableImportEvent = ScoreboardSheetEventPayload & { points: number };

function appendEvents(
  target: MutableImportEvent[],
  count: number,
  eventType: ScoreboardSheetEventPayload["event_type"],
  teamKey: "A" | "B",
  actor: { playerId: number | null; guestName: string | null },
) {
  const points = eventType === "point_1" ? 1 : eventType === "point_2" ? 2 : eventType === "point_3" ? 3 : 0;
  if (target.length + count > MAX_IMPORTED_EVENTS) {
    throw new Error(`La hoja supera el limite de ${MAX_IMPORTED_EVENTS} registros.`);
  }
  for (let index = 0; index < count; index += 1) {
    target.push({
      team_key: teamKey,
      player_id: actor.playerId,
      guest_name: actor.guestName,
      event_type: eventType,
      period: 1,
      elapsed_seconds: 0,
      points,
    });
  }
}

function readStatsTable(
  sheet: Worksheet,
  team: QuickMatchStatsTeamSnapshot,
  teamKey: "A" | "B",
) {
  const titleRow = findRowByFirstCell(sheet, team.name);
  if (titleRow === null) throw new Error(`No se encontro la tabla de ${team.name}.`);
  const headerRow = titleRow + 1;
  const columns = new Map<string, number>();
  for (let column = 1; column <= sheet.columnCount; column += 1) {
    columns.set(normalizeLookup(getCellText(sheet.getCell(headerRow, column))), column);
  }
  const required = ["no.", "jugador", "tl", "2pt", "3pt"];
  required.forEach((label) => {
    if (!columns.has(label)) throw new Error(`Falta la columna ${label.toUpperCase()} en Estadisticas.`);
  });

  const events: MutableImportEvent[] = [];
  for (let row = headerRow + 1; row <= sheet.rowCount; row += 1) {
    const firstCell = normalizeLookup(getCellText(sheet.getCell(row, 1)));
    if (firstCell === "total del equipo") break;
    const number = getCellText(sheet.getCell(row, columns.get("no.") as number));
    const label = getCellText(sheet.getCell(row, columns.get("jugador") as number));
    const actor = resolvePlayer(team, number, label);
    const countByColumn = (name: string) => {
      const column = columns.get(name);
      return column ? getCellCount(sheet.getCell(row, column), `${name.toUpperCase()} de ${label || number || team.name}`) : 0;
    };
    const counts = {
      point_1: countByColumn("tl"),
      point_2: countByColumn("2pt"),
      point_3: countByColumn("3pt"),
      miss: countByColumn("fallos"),
      assist: countByColumn("ast"),
      rebound: countByColumn("reb"),
      foul: countByColumn("faltas"),
    };
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    if (!total) continue;
    if (!actor) throw new Error(`Falta identificar al jugador en la fila ${row} de ${team.name}.`);
    (Object.entries(counts) as Array<[keyof typeof counts, number]>).forEach(([type, count]) => {
      appendEvents(events, count, type, teamKey, actor);
    });
  }
  return events;
}

function readProgressiveScore(
  sheet: Worksheet,
  team: QuickMatchStatsTeamSnapshot,
  teamKey: "A" | "B",
) {
  const events: MutableImportEvent[] = [];
  let previousScore = 0;
  for (let score = 1; score <= 160; score += 1) {
    const marker = getCellText(getProgressiveScoreCell(sheet, teamKey, score));
    if (!marker) continue;
    const points = score - previousScore;
    if (points < 1 || points > 3) {
      throw new Error(`El marcador progresivo de ${team.name} salta de ${previousScore} a ${score}.`);
    }
    const actor = resolvePlayer(team, marker, "");
    if (!actor) throw new Error(`No se pudo identificar el numero ${marker} de ${team.name}.`);
    appendEvents(events, 1, `point_${points}` as "point_1" | "point_2" | "point_3", teamKey, actor);
    previousScore = score;
  }
  return events;
}

function readPeriodScores(sheet: Worksheet) {
  const closureRow = findRowByFirstCell(sheet, "CIERRE DEL PARTIDO");
  if (closureRow === null) return { A: [], B: [], finalA: null, finalB: null };
  const readTeam = (row: number) => {
    const periods = [7, 9, 11, 13, 15].map((column) => getCellCount(sheet.getCell(row, column), "Marcador por periodo"));
    const finalText = getCellText(sheet.getCell(row, 17));
    return { periods, final: finalText ? getCellCount(sheet.getCell(row, 17), "Marcador final") : null };
  };
  const teamA = readTeam(closureRow + 2);
  const teamB = readTeam(closureRow + 3);
  return { A: teamA.periods, B: teamB.periods, finalA: teamA.final, finalB: teamB.final };
}

function assignScoringPeriods(events: MutableImportEvent[], targets: number[], teamName: string) {
  const scoring = events.filter((event) => event.points > 0);
  if (!targets.some((value) => value > 0)) return;
  const expected = targets.reduce((sum, value) => sum + value, 0);
  const actual = scoring.reduce((sum, event) => sum + event.points, 0);
  if (expected !== actual) {
    throw new Error(`Los parciales de ${teamName} suman ${expected}, pero sus anotaciones suman ${actual}.`);
  }

  let remaining = [...scoring];
  targets.forEach((target, periodIndex) => {
    if (!target) return;
    const states = new Map<number, number[]>([[0, []]]);
    remaining.forEach((event, index) => {
      [...states.entries()].forEach(([sum, indexes]) => {
        const next = sum + event.points;
        if (next <= target && !states.has(next)) states.set(next, [...indexes, index]);
      });
    });
    const selected = states.get(target);
    if (!selected) {
      throw new Error(`No se pueden repartir las anotaciones de ${teamName} para cuadrar el periodo ${periodIndex + 1}.`);
    }
    const selectedSet = new Set(selected);
    remaining.forEach((event, index) => {
      if (selectedSet.has(index)) event.period = periodIndex + 1;
    });
    remaining = remaining.filter((_, index) => !selectedSet.has(index));
  });
}

function interleaveScoringEvents(
  teamAEvents: MutableImportEvent[],
  teamBEvents: MutableImportEvent[],
) {
  const ordered: MutableImportEvent[] = [];
  const maxPeriod = Math.max(
    1,
    ...teamAEvents.map((event) => event.period),
    ...teamBEvents.map((event) => event.period),
  );
  for (let period = 1; period <= maxPeriod; period += 1) {
    const teamA = teamAEvents.filter((event) => event.period === period);
    const teamB = teamBEvents.filter((event) => event.period === period);
    const count = Math.max(teamA.length, teamB.length);
    for (let index = 0; index < count; index += 1) {
      if (teamA[index]) ordered.push(teamA[index]);
      if (teamB[index]) ordered.push(teamB[index]);
    }
  }
  return ordered;
}

export async function importQuickMatchWorkbook(matchId: number, file: File) {
  const workbook = new ExcelJS.Workbook();
  const bytes = new Uint8Array(await file.arrayBuffer());
  await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer);
  const metadata = readMetadata(workbook);
  if (metadata.get("template_type") !== "match_manual_entry") {
    throw new Error("El archivo no es una hoja de partido compatible.");
  }
  if (Number(metadata.get("match_id")) !== matchId) {
    throw new Error("La hoja pertenece a otro partido.");
  }

  const snapshot = await getQuickMatchStatsSnapshot(matchId);
  if (
    Number(metadata.get("team_a_id")) !== snapshot.team_a.id ||
    Number(metadata.get("team_b_id")) !== snapshot.team_b.id
  ) {
    throw new Error("Los equipos de la hoja no coinciden con este partido.");
  }
  const statsSheet = workbook.getWorksheet("Estadisticas");
  const officialSheet = workbook.getWorksheet("Acta del partido");
  if (!statsSheet || !officialSheet) throw new Error("La hoja esta incompleta o fue modificada.");

  const teamAEvents = readStatsTable(statsSheet, snapshot.team_a, "A");
  const teamBEvents = readStatsTable(statsSheet, snapshot.team_b, "B");
  const statsPointsA = teamAEvents.reduce((sum, event) => sum + event.points, 0);
  const statsPointsB = teamBEvents.reduce((sum, event) => sum + event.points, 0);
  const progressiveA = readProgressiveScore(officialSheet, snapshot.team_a, "A");
  const progressiveB = readProgressiveScore(officialSheet, snapshot.team_b, "B");
  const progressivePointsA = progressiveA.reduce((sum, event) => sum + event.points, 0);
  const progressivePointsB = progressiveB.reduce((sum, event) => sum + event.points, 0);

  if (statsPointsA && progressivePointsA && statsPointsA !== progressivePointsA) {
    throw new Error(`El marcador de ${snapshot.team_a.name} no coincide entre Acta y Estadisticas.`);
  }
  if (statsPointsB && progressivePointsB && statsPointsB !== progressivePointsB) {
    throw new Error(`El marcador de ${snapshot.team_b.name} no coincide entre Acta y Estadisticas.`);
  }
  const scoringA = statsPointsA ? teamAEvents.filter((event) => event.points > 0) : progressiveA;
  const scoringB = statsPointsB ? teamBEvents.filter((event) => event.points > 0) : progressiveB;
  const nonScoringA = teamAEvents.filter((event) => event.points === 0);
  const nonScoringB = teamBEvents.filter((event) => event.points === 0);
  const finalA = scoringA.reduce((sum, event) => sum + event.points, 0);
  const finalB = scoringB.reduce((sum, event) => sum + event.points, 0);
  const periodScores = readPeriodScores(officialSheet);
  if (periodScores.finalA !== null && periodScores.finalA !== finalA) {
    throw new Error(`El marcador final de ${snapshot.team_a.name} no coincide con sus anotaciones.`);
  }
  if (periodScores.finalB !== null && periodScores.finalB !== finalB) {
    throw new Error(`El marcador final de ${snapshot.team_b.name} no coincide con sus anotaciones.`);
  }
  assignScoringPeriods(scoringA, periodScores.A, snapshot.team_a.name);
  assignScoringPeriods(scoringB, periodScores.B, snapshot.team_b.name);

  const imported = [
    ...interleaveScoringEvents(scoringA, scoringB),
    ...nonScoringA,
    ...nonScoringB,
  ];
  if (!imported.length) throw new Error("La hoja no contiene puntos ni estadisticas para cargar.");
  const payload: ScoreboardSheetEventPayload[] = imported.map((event) => ({
    team_key: event.team_key,
    player_id: event.player_id,
    guest_name: event.guest_name,
    event_type: event.event_type,
    period: event.period,
    elapsed_seconds: event.elapsed_seconds,
  }));
  await replaceMatchScoreboardFromSheet(matchId, payload);
  return { scoreA: finalA, scoreB: finalB, eventCount: payload.length };
}
