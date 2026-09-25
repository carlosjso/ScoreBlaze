import { useNavigate } from "react-router-dom";

import { getCompetitionCapabilities } from "@/features/leagues/competitionCapabilities";
import type { LeagueListItem } from "@/features/leagues/Leagues.types";
import { Button } from "@/shared/components/ui";

type LeagueSectionNavProps = {
  leagueId?: number | null;
  league?: Pick<LeagueListItem, "id" | "competitionType" | "finalPhaseEnabled" | "finalPhaseFormat" | "finalPhasePreset"> | null;
  active?: "dashboard" | "bracket" | "groups" | "matches" | "standings" | "teams";
};

export function LeagueSectionNav({
  leagueId,
  league,
  active,
}: LeagueSectionNavProps) {
  const navigate = useNavigate();
  const resolvedLeagueId = league?.id ?? leagueId;
  const capabilities = league ? getCompetitionCapabilities(league) : null;

  const goTo = (section: "dashboard" | "bracket" | "groups" | "matches" | "standings" | "teams") => {
    if (!resolvedLeagueId) {
      navigate("/leagues");
      return;
    }

    if (section === "dashboard") {
      navigate(`/leagues/${resolvedLeagueId}`);
      return;
    }

    if (section === "matches") {
      navigate(`/leagues/${resolvedLeagueId}/matches`);
      return;
    }

    if (section === "bracket") {
      navigate(`/leagues/${resolvedLeagueId}/bracket`);
      return;
    }

    if (section === "groups") {
      navigate(`/leagues/${resolvedLeagueId}/groups`);
      return;
    }

    if (section === "standings") {
      navigate(`/leagues/${resolvedLeagueId}/standings`);
      return;
    }

    navigate(`/leagues/${resolvedLeagueId}/teams`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={active === "dashboard" ? "primary" : "outline"}
        onClick={() => goTo("dashboard")}
      >
        Dashboard
      </Button>
      {capabilities?.showBracket ? (
        <Button
          variant={active === "bracket" ? "primary" : "outline"}
          onClick={() => goTo("bracket")}
        >
          Llaves
        </Button>
      ) : null}
      {league?.competitionType === "GROUPS" ? (
        <Button
          variant={active === "groups" ? "primary" : "outline"}
          onClick={() => goTo("groups")}
        >
          Grupos
        </Button>
      ) : null}
      <Button
        variant={active === "matches" ? "primary" : "outline"}
        onClick={() => goTo("matches")}
      >
        Partidos
      </Button>
      {capabilities?.showStandings && league?.competitionType !== "GROUPS" ? (
        <Button
          variant={active === "standings" ? "primary" : "outline"}
          onClick={() => goTo("standings")}
        >
          Tabla
        </Button>
      ) : null}
      <Button
        variant={active === "teams" ? "primary" : "outline"}
        onClick={() => goTo("teams")}
      >
        Equipos
      </Button>
    </div>
  );
}
