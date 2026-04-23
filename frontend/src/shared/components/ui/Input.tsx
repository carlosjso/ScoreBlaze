import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onRightIconClick?: () => void;
  containerClassName?: string;
};

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  onRightIconClick,
  containerClassName,
  className,
  ...props
}: InputProps) {
  return (
    <label className={cn("block space-y-1", containerClassName)}>
      {label ? <span className="text-xs font-semibold text-slate-600">{label}</span> : null}
      <span className="relative block">
        {leftIcon ? <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span> : null}
        <input
          {...props}
          className={cn("sb-input", leftIcon ? "pl-9" : undefined, rightIcon ? "pr-10" : undefined, className)}
        />
        {rightIcon ? (
          onRightIconClick ? (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              aria-label="Limpiar filtro"
            >
              {rightIcon}
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</span>
          )
        ) : null}
      </span>
      {error ? <span className="text-xs text-red-600">{error}</span> : hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}
