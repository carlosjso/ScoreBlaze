import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@/styles/global.css";

import AppLayout from "@/app/layouts/AppLayout";
import { QueryProvider } from "@/app/providers/QueryProvider";
import BasketballHubPage from "@/features/basketball/BasketballHubPage";
import LeaguesPage from "@/features/leagues/LeaguesPage";
import Players from "@/features/players/Players";
import PlayerTeamAssignmentPage from "@/features/players/PlayerTeamAssignmentPage";
import QuickMatches from "@/features/quick-matches/QuickMatches";
import QuickMatchStatsPage from "@/features/quick-matches/QuickMatchStatsPage";
import Scoreboard from "@/features/scoreboard/Scoreboard";
import LiveScoreboard from "@/features/scoreboard/LiveScoreboard";
import SportDashboardPage from "@/features/sports/SportDashboardPage";
import SportsPage from "@/features/sports/SportsPage";
import TeamRosterPage, { TeamRosterManagePage } from "@/features/teams/TeamRosterPage";
import Teams from "@/features/teams/Teams";

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/scoreboard/live" element={<LiveScoreboard />} />
          <Route path="/scoreboard/live/:matchId" element={<LiveScoreboard />} />

          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/sports"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route path="/dashboard" element={<SportsPage />} />
            <Route path="/basketball" element={<BasketballHubPage />} />
            <Route path="/players/:playerId/teams" element={<PlayerTeamAssignmentPage />} />
            <Route path="/players" element={<Players />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:teamId/roster" element={<TeamRosterPage />} />
            <Route path="/teams/:teamId/roster/manage" element={<TeamRosterManagePage />} />
            <Route path="/team-players" element={<Navigate to="/teams" replace />} />
            <Route path="/quick-match" element={<QuickMatches />} />
            <Route path="/quick-match/:matchId/stats" element={<QuickMatchStatsPage />} />
            <Route path="/scoreboard" element={<Scoreboard />} />
             <Route path="/scoreboard/:matchId" element={<Scoreboard />} />
            <Route path="/leagues" element={<LeaguesPage />} />
            <Route
              path="/football"
              element={<SportDashboardPage sport="Futbol" />}
            />
            <Route
              path="/tennis"
              element={<SportDashboardPage sport="Tennis" />}
            />
            <Route
              path="/padel"
              element={<SportDashboardPage sport="Padel" />}
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}

