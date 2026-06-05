import { cn } from "@/shared/utils/cn";

export type Status = "En curso" | "Sin empezar" | "Finalizada" | "Activo" | "Inactivo" | "Suspendido";

type StatusBadgeProps = {
  status: Status;
};

const statusClass: Record<Status, string> = {
  "En curso": "bg-amber-100 text-amber-700",
  "Sin empezar": "bg-red-100 text-red-700",
  Finalizada: "bg-emerald-100 text-emerald-700",
  Activo: "bg-emerald-100 text-emerald-700",
  Inactivo: "bg-red-100 text-red-700",
  Suspendido: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", statusClass[status])}>
      {status}
    </span>
  );
}
