import { useParams } from "react-router-dom";

import { PageHeader, Panel } from "@/shared/components/ui";

export default function QuickMatchStatsPage() {
  const { matchId } = useParams();

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Consultar estadisticas"
          subtitle={`Vista placeholder para el partido ${matchId ?? "-"}. Aqui construiremos el detalle estadistico despues.`}
        />

        <Panel className="p-6">
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Esta pestaña queda lista para la futura vista de estadisticas del partido.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Cuando sigamos esta fase, aqui mostraremos box score, jugadas, parciales y resumen.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
