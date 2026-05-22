import { Button, Input, Modal } from "@/shared/components/ui";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import type { LeagueFinalPhasePresetOption, LeagueListItem } from "@/features/leagues/Leagues.types";

const finalPhasePresetLabels: Record<LeagueFinalPhasePresetOption, string> = {
  TOP_4_SINGLE_GAME: "Top 4 - Partido unico",
  TOP_8_SINGLE_GAME: "Top 8 - Partido unico",
  TOP_8_HOME_AWAY: "Top 8 - Ida y vuelta",
  TOP_6_SINGLE_GAME_WITH_BYES: "Top 6 - Bye 1ro y 2do",
  TOP_16_SINGLE_GAME: "Top 16 - Partido unico",
  TOP_32_SINGLE_GAME: "Top 32 - Partido unico",
  NBA_PLAY_IN_TOP_10: "NBA - Play-In (10 equipos)",
  DOUBLE_ELIMINATION_TOP_8: "Doble eliminacion - Top 8",
  DOUBLE_ELIMINATION_TOP_16: "Doble eliminacion - Top 16",
  CUSTOM: "Personalizado",
};

type LeagueDetailModalProps = {
  league: LeagueListItem | null;
  isOpen: boolean;
  teamNameById: Map<number, string>;
  onClose: () => void;
};

export function LeagueDetailModal({ league, isOpen, teamNameById, onClose }: LeagueDetailModalProps) {
  const isElimination = league?.competitionType === "ELIMINATION";
  const entityLabel = isElimination ? "eliminatoria" : "liga";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Detalle de ${entityLabel}`} maxWidthClassName="max-w-2xl">
      {league ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Nombre" value={league.name} disabled />
          <Input label="Responsable" value={league.responsibleName} disabled />
          <Input label="Correo del responsable" value={league.responsibleEmail} disabled />
          <Input label="Categoria" value={league.category} disabled />
          <Input label="Fecha de inicio" value={league.startDate} disabled />
          <Input label="Fecha de fin" value={league.endDate} disabled />
          <Input label="Tipo" value={league.competitionType === "ELIMINATION" ? "Eliminatoria" : "Liga"} disabled />

          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-600">Estatus</p>
            <div className="flex min-h-10 items-center rounded-[14px] border border-slate-200 bg-slate-100/90 px-3">
              <StatusBadge status={league.status} />
            </div>
          </div>

          <Input label="Equipos asignados" value={String(league.teamCount)} disabled />
          <Input
            label="Fase final"
            value={
              league.finalPhaseEnabled
                ? `${finalPhasePresetLabels[league.finalPhasePreset]} (Top ${league.finalPhaseQualifiedTeams})`
                : "Desactivada"
            }
            disabled
          />

          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-slate-600">Metricas registradas</p>
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300 bg-white p-3">
              {league.trackedStats.length > 0 ? (
                league.trackedStats.map((stat) => (
                  <span key={stat} className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-700">
                    {stat}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">Sin metricas configuradas.</span>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <p className="mb-2 text-xs font-semibold text-slate-600">Equipos asignados</p>
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300 bg-white p-3">
              {league.teamIds.length > 0 ? (
                league.teamIds.map((teamId) => (
                  <span key={teamId} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {teamNameById.get(teamId) ?? `Equipo #${teamId}`}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">Sin equipos asignados.</span>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
