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
      <select
        {...props}
        aria-invalid={error ? true : undefined}
        className={cn(
          "sb-input",
          error && "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100",
          className,
        )}
      >
        {children}
      </select>
      {error ? (
        <span className="block rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}
