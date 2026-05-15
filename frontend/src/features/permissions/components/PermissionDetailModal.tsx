import { KeyRound, ShieldCheck } from "lucide-react";

import type { PermissionListItem } from "@/features/permissions/Permissions.types";
import { Button, Modal } from "@/shared/components/ui";

type PermissionDetailModalProps = {
  permission: PermissionListItem | null;
  isOpen: boolean;
  onClose: () => void;
};

export function PermissionDetailModal({
  permission,
  isOpen,
  onClose,
}: PermissionDetailModalProps) {
  if (!permission) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del permiso" maxWidthClassName="max-w-md">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700">
              <KeyRound size={18} />
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-900">{permission.name}</p>
              <p className="mt-1 text-sm text-slate-500">Permiso disponible</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                ID
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">{permission.id}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Roles
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                <ShieldCheck size={15} />
                {permission.roleCount}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
