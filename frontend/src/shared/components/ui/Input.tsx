import { useState, type FocusEventHandler, type InputHTMLAttributes, type ReactNode } from "react";

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

function getInputCharacterCount(value: InputProps["value"] | InputProps["defaultValue"]): number {
  if (typeof value === "string") {
    return value.length;
  }

  if (typeof value === "number") {
    return String(value).length;
  }

  if (Array.isArray(value)) {
    return value.join(",").length;
  }

  return 0;
}

export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  onRightIconClick,
  containerClassName,
  className,
  value,
  defaultValue,
  maxLength,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const shouldShowCharacterCount = typeof maxLength === "number" && maxLength > 0 && isFocused;
  const characterCount = getInputCharacterCount(value ?? defaultValue);
  const shouldShowCompactCounter = shouldShowCharacterCount && !error && !hint;

  const handleFocus: FocusEventHandler<HTMLInputElement> = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur: FocusEventHandler<HTMLInputElement> = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <label className={cn("block space-y-1", containerClassName)}>
      {label ? <span className="text-xs font-semibold text-slate-600">{label}</span> : null}
      <span className="relative block">
        {leftIcon ? <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</span> : null}
        <input
          {...props}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-invalid={error ? true : undefined}
          className={cn(
            "sb-input",
            error && "border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100",
            leftIcon ? "pl-9" : undefined,
            rightIcon ? "pr-10" : undefined,
            className,
          )}
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
      {shouldShowCompactCounter ? (
        <span className="block -mt-0.5 text-right text-[11px] font-medium leading-none text-slate-400 tabular-nums">
          {characterCount}/{maxLength}
        </span>
      ) : error || hint || shouldShowCharacterCount ? (
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0 flex-1">
            {error ? (
              <span className="block rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">
                {error}
              </span>
            ) : hint ? (
              <span className="text-xs text-slate-500">{hint}</span>
            ) : null}
          </span>

          {shouldShowCharacterCount ? (
            <span
              className={cn(
                "shrink-0 pt-0.5 text-[11px] font-medium leading-none tabular-nums",
                error ? "text-red-600" : "text-slate-400",
              )}
            >
              {characterCount}/{maxLength}
            </span>
          ) : null}
        </span>
      ) : null}
    </label>
  );
}
