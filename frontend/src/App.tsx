import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@/styles/global.css";

import AppLayout from "@/app/layouts/AppLayout";
import { useAuth } from "@/app/providers/AuthProvider";
import { AuthProvider } from "@/app/providers/AuthProvider";
import { QueryProvider } from "@/app/providers/QueryProvider";
import AuthPage from "@/features/auth/AuthPage";
import { GuestRoute, PermissionRoute, ProtectedRoute } from "@/features/auth/AuthRouteGuards";
import LeagueCalendarPage from "@/features/leagues/LeagueCalendarPage";
import LeagueBracketPage from "@/features/leagues/LeagueBracketPage";
import LeagueDashboardPage from "@/features/leagues/LeagueDashboardPage";
import LeagueFinalPhaseSettingsPage from "@/features/leagues/LeagueFinalPhaseSettingsPage";
import LeagueMatchesPage from "@/features/leagues/LeagueMatchesPage";
import LeagueRecordsPage from "@/features/leagues/LeagueRecordsPage";
import LeagueSettingsPage from "@/features/leagues/LeagueSettingsPage";
import LeagueStandingsPage from "@/features/leagues/LeagueStandingsPage";
import LeaguesPage from "@/features/leagues/LeaguesPage";
import LeagueTeamsPage, { LeagueTeamsManagePage } from "@/features/leagues/LeagueTeamsManagePage";
import Players from "@/features/players/Players";
import PlayerTeamAssignmentPage from "@/features/players/PlayerTeamAssignmentPage";
import CompletePlayerProfilePage from "@/features/player-profile/CompletePlayerProfilePage";
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
import { getFirstAllowedBasketballPath, getFirstAllowedPath } from "@/features/auth/permissions";

function HomeRedirect() {
  const { session } = useAuth();
  return <Navigate to={getFirstAllowedPath(session) ?? "/dashboard"} replace />;
}

function BasketballRedirect() {
  const { session } = useAuth();
  return <Navigate to={getFirstAllowedBasketballPath(session) ?? getFirstAllowedPath(session) ?? "/dashboard"} replace />;
}

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/scoreboard/live" element={<LiveScoreboard />} />
            <Route path="/scoreboard/live/:matchId" element={<LiveScoreboard />} />
            <Route path="/invitation/complete" element={<CompletePlayerProfilePage />} />
            <Route path="/player-profile/complete" element={<CompletePlayerProfilePage />} />

            <Route element={<GuestRoute />}>
              <Route path="/login" element={<AuthPage mode="login" />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<HomeRedirect />} />
                <Route path="/sports" element={<Navigate to="/dashboard" replace />} />
                <Route element={<PermissionRoute permissions={["dashboard.view"]} />}>
                  <Route path="/dashboard" element={<SportsPage />} />
                </Route>
                <Route path="/basketball" element={<BasketballRedirect />} />
                <Route element={<PermissionRoute permissions={["players.view"]} />}>
                  <Route path="/players" element={<Players />} />
                  <Route path="/players/:playerId/teams" element={<PlayerTeamAssignmentPage />} />
                </Route>
                <Route element={<PermissionRoute permissions={["teams.view"]} />}>
                  <Route path="/teams" element={<Teams />} />
                  <Route path="/teams/:teamId/roster" element={<TeamRosterPage />} />
                </Route>
                <Route element={<PermissionRoute permissions={["teams.manage_roster"]} />}>
                  <Route path="/teams/:teamId/roster/manage" element={<TeamRosterManagePage />} />
                </Route>
                <Route path="/team-players" element={<Navigate to="/teams" replace />} />
                <Route element={<PermissionRoute permissions={["quick_match.view"]} />}>
                  <Route path="/quick-match" element={<QuickMatches />} />
                </Route>
                <Route element={<PermissionRoute permissions={["quick_match.view_stats"]} />}>
                  <Route path="/quick-match/:matchId/stats" element={<QuickMatchStatsPage />} />
                </Route>
                <Route element={<PermissionRoute permissions={["quick_match.edit"]} />}>
                  <Route path="/scoreboard" element={<Scoreboard />} />
                  <Route path="/scoreboard/:matchId" element={<Scoreboard />} />
                </Route>
                <Route path="/settings" element={<SettingsPage />} />
                <Route element={<PermissionRoute permissions={["permissions.view"]} />}>
                  <Route path="/settings/permissions" element={<Permissions />} />
                </Route>
                <Route element={<PermissionRoute permissions={["roles.view"]} />}>
                  <Route path="/settings/role-permissions" element={<RolePermissions />} />
                  <Route path="/settings/roles" element={<Roles />} />
                </Route>
                <Route element={<PermissionRoute permissions={["users.view"]} />}>
                  <Route path="/settings/users" element={<Users />} />
                </Route>
                <Route element={<PermissionRoute permissions={["leagues.view"]} />}>
                  <Route path="/leagues" element={<LeaguesPage />} />
                </Route>
                <Route path="/eliminations" element={<Navigate to="/leagues?type=ELIMINATION" replace />} />
                <Route element={<PermissionRoute permissions={["leagues.view"]} />}>
                  <Route path="/leagues/:leagueId" element={<LeagueDashboardPage />} />
                  <Route path="/leagues/:leagueId/bracket" element={<LeagueBracketPage />} />
                  <Route path="/leagues/:leagueId/calendar" element={<LeagueCalendarPage />} />
                  <Route path="/leagues/:leagueId/records" element={<LeagueRecordsPage />} />
                  <Route path="/leagues/:leagueId/teams" element={<LeagueTeamsPage />} />
                  <Route path="/leagues/:leagueId/matches" element={<LeagueMatchesPage />} />
                  <Route path="/leagues/:leagueId/standings" element={<LeagueStandingsPage />} />
                  <Route path="/leagues/:leagueId/matches/:matchId/stats" element={<QuickMatchStatsPage />} />
                </Route>
                <Route element={<PermissionRoute permissions={["leagues.edit"]} />}>
                  <Route path="/leagues/:leagueId/teams/manage" element={<LeagueTeamsManagePage />} />
                  <Route path="/leagues/:leagueId/final-phase/settings" element={<LeagueFinalPhaseSettingsPage />} />
                  <Route path="/leagues/:leagueId/settings" element={<LeagueSettingsPage />} />
                </Route>
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

