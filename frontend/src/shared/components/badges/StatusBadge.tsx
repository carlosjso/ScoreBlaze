import { cn } from "@/shared/utils/cn";

export type Status = "En curso" | "Sin empezar" | "Finalizada" | "Activo" | "Inactivo" | "Suspendido";

type StatusBadgeProps = {
  status: Status;
};

const statusClass: Record<Status, string> = {
  "En curso": "bg-emerald-100 text-emerald-700",
  "Sin empezar": "bg-rose-100 text-rose-700",
  Finalizada: "bg-slate-200 text-slate-700",
  Activo: "bg-emerald-100 text-emerald-700",
  Inactivo: "bg-slate-200 text-slate-700",
  Suspendido: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", statusClass[status])}>
      {status}
    </span>
  );
}
