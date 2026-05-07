import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@/styles/global.css";

import AppLayout from "@/app/layouts/AppLayout";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { QueryProvider } from "@/app/providers/QueryProvider";
import AuthPage from "@/features/auth/AuthPage";
import { GuestRoute, ProtectedRoute } from "@/features/auth/AuthRouteGuards";
import BasketballHubPage from "@/features/basketball/BasketballHubPage";
import LeaguesPage from "@/features/leagues/LeaguesPage";
import Players from "@/features/players/Players";
import PlayerTeamAssignmentPage from "@/features/players/PlayerTeamAssignmentPage";
import Permissions from "@/features/permissions/Permissions";
import QuickMatches from "@/features/quick-matches/QuickMatches";
import QuickMatchStatsPage from "@/features/quick-matches/QuickMatchStatsPage";
import RolePermissions from "@/features/role-permissions/RolePermissions";
import Roles from "@/features/roles/Roles";
import Scoreboard from "@/features/scoreboard/Scoreboard";
import LiveScoreboard from "@/features/scoreboard/LiveScoreboard";
import SettingsPage from "@/features/settings/SettingsPage";
import SportDashboardPage from "@/features/sports/SportDashboardPage";
import SportsPage from "@/features/sports/SportsPage";
import TeamRosterPage, { TeamRosterManagePage } from "@/features/teams/TeamRosterPage";
import Teams from "@/features/teams/Teams";
import Users from "@/features/users/Users";

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/scoreboard/live" element={<LiveScoreboard />} />
            <Route path="/scoreboard/live/:matchId" element={<LiveScoreboard />} />

            <Route element={<GuestRoute />}>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<AuthPage mode="register" />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/sports" element={<Navigate to="/dashboard" replace />} />
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
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/permissions" element={<Permissions />} />
                <Route path="/settings/role-permissions" element={<RolePermissions />} />
                <Route path="/settings/roles" element={<Roles />} />
                <Route path="/settings/users" element={<Users />} />
                <Route path="/leagues" element={<LeaguesPage />} />
                <Route path="/football" element={<SportDashboardPage sport="Futbol" />} />
                <Route path="/tennis" element={<SportDashboardPage sport="Tennis" />} />
                <Route path="/padel" element={<SportDashboardPage sport="Padel" />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  );
}

