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
        "relative inline-flex h-8 w-[58px] shrink-0 items-center rounded-full border transition",
        checked
          ? "border-emerald-300 bg-emerald-400/90"
          : "border-slate-200 bg-slate-200",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <span
        className={cn(
          "absolute top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] transition-all",
          checked ? "left-[30px]" : "left-1",
        )}
      >
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full transition",
            checked ? "bg-emerald-500" : "bg-slate-300",
          )}
        />
      </span>
    </button>
  );
}
