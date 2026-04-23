import type { ReactNode, SelectHTMLAttributes } from "react";

import { cn } from "@/shared/utils/cn";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  containerClassName?: string;
};

export function Select({ label, error, hint, children, className, containerClassName, ...props }: SelectProps) {
  return (
    <label className={cn("block space-y-1", containerClassName)}>
      {label ? <span className="text-xs font-semibold text-slate-600">{label}</span> : null}
      <select {...props} className={cn("sb-input", className)}>
        {children}
      </select>
      {error ? <span className="text-xs text-red-600">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
