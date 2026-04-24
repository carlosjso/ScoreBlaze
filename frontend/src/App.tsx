import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import "@/styles/global.css";

import AppLayout from "@/app/layouts/AppLayout";
import { QueryProvider } from "@/app/providers/QueryProvider";
import BasketballHubPage from "@/pages/basketball/pages/BasketballHubPage";
import LeaguesPage from "@/pages/leagues/pages/LeaguesPage";
import Players from "@/pages/players/Players";
import QuickMatches from "@/pages/quick-matches/QuickMatches";
import SportDashboardPage from "@/pages/sports/pages/SportDashboardPage";
import SportsPage from "@/pages/sports/pages/SportsPage";
import Teams from "@/pages/teams/Teams";

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/sports" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<SportsPage />} />
            <Route path="/basketball" element={<BasketballHubPage />} />
            <Route path="/team-players" element={<Players />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/quick-match" element={<QuickMatches />} />
            <Route path="/leagues" element={<LeaguesPage />} />
            <Route path="/football" element={<SportDashboardPage sport="Futbol" />} />
            <Route path="/tennis" element={<SportDashboardPage sport="Tennis" />} />
            <Route path="/padel" element={<SportDashboardPage sport="Padel" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}
