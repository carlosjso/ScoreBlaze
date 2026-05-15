import { useNavigate } from "react-router-dom";

import { Button } from "@/shared/components/ui";

type LeagueSectionNavProps = {
  leagueId?: number | null;
  active?: "dashboard" | "matches" | "teams";
};

export function LeagueSectionNav({
  leagueId,
  active,
}: LeagueSectionNavProps) {
  const navigate = useNavigate();

  const goTo = (section: "dashboard" | "matches" | "teams") => {
    if (!leagueId) {
      navigate("/leagues");
      return;
    }

    if (section === "dashboard") {
      navigate(`/leagues/${leagueId}`);
      return;
    }

    if (section === "matches") {
      navigate(`/leagues/${leagueId}/matches`);
      return;
    }

    navigate(`/leagues/${leagueId}/teams`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={active === "dashboard" ? "primary" : "outline"}
        onClick={() => goTo("dashboard")}
      >
        Dashboard
      </Button>
      <Button
        variant={active === "matches" ? "primary" : "outline"}
        onClick={() => goTo("matches")}
      >
        Partidos
      </Button>
      <Button
        variant={active === "teams" ? "primary" : "outline"}
        onClick={() => goTo("teams")}
      >
        Equipos
      </Button>
    </div>
  );
}
