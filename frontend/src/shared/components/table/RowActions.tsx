import { Pencil, Search, Shield, Trash2, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type RowActionsProps<T> = {
  row: T;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onManage?: (row: T) => void;
  manageLabel?: string;
  manageIcon?: ReactNode;
  onSecurity?: (row: T) => void;
  securityLabel?: string;
  onDelete?: (row: T) => void;
  disabled?: boolean;
};

type ActionButtonProps = {
  title: string;
  onClick?: () => void;
  icon: ReactNode;
  className: string;
  disabled?: boolean;
};

function ActionButton({ title, onClick, icon, className, disabled }: ActionButtonProps) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-1",
        "disabled:opacity-50 disabled:hover:brightness-100",
        className
      )}
    >
      {icon}
    </button>
  );
}

export function RowActions<T>({
  row,
  onView,
  onEdit,
  onManage,
  manageLabel,
  manageIcon,
  onSecurity,
  securityLabel,
  onDelete,
  disabled,
}: RowActionsProps<T>) {
  return (
    <div className="flex justify-end gap-2">
      <ActionButton
        title="Ver detalle"
        onClick={onView ? () => onView(row) : undefined}
        icon={<Search size={14} />}
        className="border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
        disabled={disabled}
      />
      <ActionButton
        title="Editar"
        onClick={onEdit ? () => onEdit(row) : undefined}
        icon={<Pencil size={14} />}
        className="border border-slate-300 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700 group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-700"
        disabled={disabled}
      />
      <ActionButton
        title={manageLabel ?? "Gestionar jugadores"}
        onClick={onManage ? () => onManage(row) : undefined}
        icon={manageIcon ?? <UsersRound size={14} />}
        className="border border-slate-300 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        disabled={disabled}
      />
      <ActionButton
        title={securityLabel ?? "Ver equipo"}
        onClick={onSecurity ? () => onSecurity(row) : undefined}
        icon={<Shield size={14} />}
        className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
        disabled={disabled}
      />
      <ActionButton
        title="Eliminar"
        onClick={onDelete ? () => onDelete(row) : undefined}
        icon={<Trash2 size={14} />}
        className="border border-red-200 bg-white text-red-500 hover:bg-red-50"
        disabled={disabled}
      />
    </div>
  );
}
