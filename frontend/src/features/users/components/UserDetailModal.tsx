import { CalendarClock, Mail, User2 } from "lucide-react";

import type { UserListItem } from "@/features/users/Users.types";
import { Button, Modal } from "@/shared/components/ui";

type UserDetailModalProps = {
  user: UserListItem | null;
  isOpen: boolean;
  onClose: () => void;
};

const createdAtFormatter = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatCreatedAtLabel(value: string): string {
  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? value : createdAtFormatter.format(parsedDate);
}

function getAccountStatusLabel(status: string) {
  return status === "pending" ? "Pendiente de confirmar" : "Activa";
}

export function UserDetailModal({ user, isOpen, onClose }: UserDetailModalProps) {
  if (!user) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Detalle del usuario" maxWidthClassName="max-w-2xl">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700">
              <User2 size={18} />
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-900">{user.name}</p>
              <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Correo
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                <Mail size={15} />
                {user.email}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Estado
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {getAccountStatusLabel(user.accountStatus)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Creado
              </p>
              <p className="mt-2 inline-flex items-center gap-2 text-base font-semibold text-slate-900">
                <CalendarClock size={15} />
                {formatCreatedAtLabel(user.createdAt)}
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
