import { CalendarDays, MapPin, Shield, Trophy } from "lucide-react";

import type { QuickMatchListItem } from "@/features/quick-matches/QuickMatches.types";
import { Button, Input, Modal } from "@/shared/components/ui";

type QuickMatchDetailModalProps = {
  match: QuickMatchListItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function QuickMatchDetailModal({ match, isOpen, onClose }: QuickMatchDetailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle de partido rapido" maxWidthClassName="max-w-lg">
      {match ? (
        <div className="grid grid-cols-1 gap-3">
          <Input label="Partido" value={match.matchupLabel} disabled />
          <Input label="Fecha y hora" value={match.scheduleLabel} disabled leftIcon={<CalendarDays size={14} />} />
          <Input label="Estatus" value={match.statusLabel} disabled leftIcon={<Shield size={14} />} />
          <Input label="Resultado" value={`${match.scoreLabel} · ${match.resultLabel}`} disabled leftIcon={<Trophy size={14} />} />
          <Input label="Cancha" value={match.court || "Sin cancha"} disabled leftIcon={<MapPin size={14} />} />
          <Input label="Torneo" value={match.tournament || "Sin torneo"} disabled leftIcon={<MapPin size={14} />} />
          <Input label="Notas" value={match.venueLabel === "Sin sede" ? "Sin notas" : match.venueLabel} disabled />
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

