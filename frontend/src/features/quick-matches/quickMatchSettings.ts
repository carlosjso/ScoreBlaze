import { leagueTrackedStatOptions, normalizeLeagueTrackedStats } from "@/features/leagues/Leagues.types";

const QUICK_MATCH_TRACKED_STATS_STORAGE_KEY = "scoreblaze.quickMatch.trackedStats";

export function getDefaultQuickMatchTrackedStats() {
  return [...leagueTrackedStatOptions];
}

export function getQuickMatchTrackedStats() {
  if (typeof window === "undefined") {
    return getDefaultQuickMatchTrackedStats();
  }

  try {
    const rawValue = window.localStorage.getItem(QUICK_MATCH_TRACKED_STATS_STORAGE_KEY);
    if (!rawValue) {
      return getDefaultQuickMatchTrackedStats();
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return getDefaultQuickMatchTrackedStats();
    }

    return normalizeLeagueTrackedStats(parsedValue.map((value) => String(value)));
  } catch {
    return getDefaultQuickMatchTrackedStats();
  }
}

export function saveQuickMatchTrackedStats(trackedStats: string[]) {
  const normalizedTrackedStats = normalizeLeagueTrackedStats(trackedStats);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        QUICK_MATCH_TRACKED_STATS_STORAGE_KEY,
        JSON.stringify(normalizedTrackedStats),
      );
    } catch {
      // Ignore storage errors in private/incognito contexts.
    }
  }

  return normalizedTrackedStats;
}
