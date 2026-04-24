import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/shared/utils/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantMap: Record<ButtonVariant, string> = {
  primary: "sb-btn sb-btn-primary",
  secondary: "sb-btn sb-btn-secondary",
  outline: "sb-btn sb-btn-outline",
  ghost: "sb-btn sb-btn-ghost",
  danger: "sb-btn sb-btn-danger",
};

const sizeMap: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-sm",
};

const expandableIconSizeMap: Record<ButtonSize, string> = {
  sm: "h-10 w-10",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  expandOnHover?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  leftIcon,
  rightIcon,
  expandOnHover = false,
  children,
  ...props
}: ButtonProps) {
  if (expandOnHover) {
    return (
      <button
        type={props.type ?? "button"}
        {...props}
        className={cn(variantMap[variant], "sb-btn-expandable", `sb-btn-expandable-${size}`, className)}
      >
        <span className={cn("sb-btn-expandable-icon", expandableIconSizeMap[size])}>{leftIcon}</span>
        <span className="sb-btn-expandable-label">{children}</span>
        {rightIcon ? <span className="sb-btn-expandable-trailing">{rightIcon}</span> : null}
      </button>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      {...props}
      className={cn(variantMap[variant], sizeMap[size], className)}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
