import type {
  LeaguePlayerRankingRow,
  LeagueStatsSnapshot,
} from "@/features/leagues/Leagues.types";

export type LeagueLeaderPreviewItem = {
  key: string;
  category: "team" | "player";
  label: string;
  title: string;
  subtitle: string | null;
  valueLabel: string;
  teamId?: number | null;
  playerId?: number | null;
};

function pickTopPlayerByField(
  rows: LeaguePlayerRankingRow[],
  field: keyof Pick<
    LeaguePlayerRankingRow,
    "totalPoints" | "made3pt" | "totalAssists" | "totalRebounds" | "totalFouls"
  >,
) {
  const candidates = rows.filter((row) => row.matchesPlayed > 0 && row[field] > 0);
  if (!candidates.length) {
    return null;
  }

  return [...candidates].sort((left, right) => {
    if (right[field] !== left[field]) {
      return right[field] - left[field];
    }
    if (right.totalPoints !== left.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }
    if (right.made3pt !== left.made3pt) {
      return right.made3pt - left.made3pt;
    }
    if (right.totalAssists !== left.totalAssists) {
      return right.totalAssists - left.totalAssists;
    }
    if (right.totalRebounds !== left.totalRebounds) {
      return right.totalRebounds - left.totalRebounds;
    }
    return left.playerName.localeCompare(right.playerName, "es-MX");
  })[0];
}

export function buildLeagueLeaderPreviewItems(
  stats: LeagueStatsSnapshot | null,
): LeagueLeaderPreviewItem[] {
  if (!stats) {
    return [];
  }

  const items: LeagueLeaderPreviewItem[] = [];
  const topScorer = pickTopPlayerByField(stats.playerRankings, "totalPoints");
  const topThreePoint = pickTopPlayerByField(stats.playerRankings, "made3pt");
  const topAssist = pickTopPlayerByField(stats.playerRankings, "totalAssists");
  const topRebound = pickTopPlayerByField(stats.playerRankings, "totalRebounds");
  const topFoul = pickTopPlayerByField(stats.playerRankings, "totalFouls");

  if (stats.teamLeaders.mostWins?.teamName) {
    items.push({
      key: "team-most-wins",
      category: "team",
      label: "Mas victorias",
      title: stats.teamLeaders.mostWins.teamName,
      subtitle: "Lider de equipos",
      valueLabel: `${stats.teamLeaders.mostWins.value} victorias`,
      teamId: stats.teamLeaders.mostWins.teamId,
    });
  }

  if (stats.teamLeaders.topOffense?.teamName) {
    items.push({
      key: "team-top-offense",
      category: "team",
      label: "Mejor ofensiva",
      title: stats.teamLeaders.topOffense.teamName,
      subtitle: "Lider de equipos",
      valueLabel: `${stats.teamLeaders.topOffense.value} PF`,
      teamId: stats.teamLeaders.topOffense.teamId,
    });
  }

  if (stats.teamLeaders.bestDefense?.teamName) {
    items.push({
      key: "team-best-defense",
      category: "team",
      label: "Mejor defensa",
      title: stats.teamLeaders.bestDefense.teamName,
      subtitle: "Lider de equipos",
      valueLabel: `${stats.teamLeaders.bestDefense.value} PC`,
      teamId: stats.teamLeaders.bestDefense.teamId,
    });
  }

  if (stats.overview.champion?.teamName) {
    items.push({
      key: "team-current-leader",
      category: "team",
      label: "Lider actual",
      title: stats.overview.champion.teamName,
      subtitle: "Tabla general",
      valueLabel: `${stats.overview.champion.value} pts tabla`,
      teamId: stats.overview.champion.teamId,
    });
  }

  if (topScorer) {
    items.push({
      key: "player-top-scorer",
      category: "player",
      label: "Mayor anotador",
      title: topScorer.playerName,
      subtitle: topScorer.teamName,
      valueLabel: `${topScorer.totalPoints} PTS`,
      playerId: topScorer.playerId,
      teamId: topScorer.teamId,
    });
  }

  if (topThreePoint) {
    items.push({
      key: "player-top-three",
      category: "player",
      label: "Mayor triplero",
      title: topThreePoint.playerName,
      subtitle: topThreePoint.teamName,
      valueLabel: `${topThreePoint.made3pt} triples`,
      playerId: topThreePoint.playerId,
      teamId: topThreePoint.teamId,
    });
  }

  if (stats.trackedStats.includes("Asistencias") && topAssist) {
    items.push({
      key: "player-top-assist",
      category: "player",
      label: "Mayor asistidor",
      title: topAssist.playerName,
      subtitle: topAssist.teamName,
      valueLabel: `${topAssist.totalAssists} asist.`,
      playerId: topAssist.playerId,
      teamId: topAssist.teamId,
    });
  }

  if (stats.trackedStats.includes("Rebotes") && topRebound) {
    items.push({
      key: "player-top-rebound",
      category: "player",
      label: "Mayor reboteador",
      title: topRebound.playerName,
      subtitle: topRebound.teamName,
      valueLabel: `${topRebound.totalRebounds} reb.`,
      playerId: topRebound.playerId,
      teamId: topRebound.teamId,
    });
  }

  if (stats.trackedStats.includes("Faltas") && topFoul) {
    items.push({
      key: "player-top-foul",
      category: "player",
      label: "Mas faltas",
      title: topFoul.playerName,
      subtitle: topFoul.teamName,
      valueLabel: `${topFoul.totalFouls} faltas`,
      playerId: topFoul.playerId,
      teamId: topFoul.teamId,
    });
  }

  return items;
}
