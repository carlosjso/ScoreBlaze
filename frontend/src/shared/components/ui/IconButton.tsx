import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type IconButtonVariant = "ghost" | "outline" | "surface";

const variantMap: Record<IconButtonVariant, string> = {
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
  surface: "bg-slate-100 text-slate-700 hover:bg-slate-200",
};

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon?: ReactNode;
  variant?: IconButtonVariant;
};

export function IconButton({ label, icon, variant = "outline", className, children, ...props }: IconButtonProps) {
  return (
    <button
      type={props.type ?? "button"}
      aria-label={label}
      title={label}
      {...props}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-1 disabled:opacity-60",
        variantMap[variant],
        className
      )}
    >
      {icon ?? children}
    </button>
  );
}
