import { Check, X } from "lucide-react";

import { cn } from "@/shared/utils/cn";

type PermissionSwitchProps = {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
};

export function PermissionSwitch({
  checked,
  disabled = false,
  onClick,
  label,
}: PermissionSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full border p-[3px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-1",
        checked
          ? "border-emerald-300 bg-[linear-gradient(135deg,#34d399,#10b981)] shadow-[0_10px_24px_rgba(16,185,129,0.18)]"
          : "border-slate-300 bg-[linear-gradient(135deg,#f8fafc,#e2e8f0)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-[2px] rounded-full transition-opacity",
          checked ? "bg-white/8 opacity-100" : "bg-white/50 opacity-100",
        )}
      />

      <span
        aria-hidden="true"
        className={cn(
          "absolute left-[6px] inline-flex items-center justify-center text-slate-400 transition-all duration-200",
          checked ? "opacity-0 scale-75" : "opacity-100 scale-100",
        )}
      >
        <X size={9} strokeWidth={2.4} />
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "absolute right-[6px] inline-flex items-center justify-center transition-all duration-200",
          checked ? "opacity-100 scale-100 text-white/90" : "opacity-0 scale-75 text-white/70",
        )}
      >
        <Check size={9} strokeWidth={2.6} />
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "relative z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/80 bg-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition-all duration-200 group-active:scale-95",
          checked ? "translate-x-5 text-emerald-600" : "translate-x-0 text-slate-400",
        )}
      >
        {checked ? <Check size={10} strokeWidth={2.6} /> : <X size={10} strokeWidth={2.4} />}
      </span>
    </button>
  );
}
