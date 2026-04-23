import { ArrowDownAZ, ArrowUpAZ } from "lucide-react";

import { cn } from "@/shared/utils/cn";

type SortHeaderButtonProps<T extends string> = {
  label: string;
  sortKey: T;
  activeKey: T;
  direction: "asc" | "desc";
  onToggle: (key: T) => void;
};

export function SortHeaderButton<T extends string>({
  label,
  sortKey,
  activeKey,
  direction,
  onToggle,
}: SortHeaderButtonProps<T>) {
  const active = sortKey === activeKey;

  return (
    <button
      type="button"
      onClick={() => onToggle(sortKey)}
      className={cn(
        "inline-flex items-center gap-1 font-semibold transition text-slate-800 hover:text-slate-900"
      )}
    >
      <span>{label}</span>
      {active && direction === "asc" ? <ArrowUpAZ size={13} className="text-slate-400" /> : null}
      {active && direction === "desc" ? <ArrowDownAZ size={13} className="text-slate-400" /> : null}
    </button>
  );
}
